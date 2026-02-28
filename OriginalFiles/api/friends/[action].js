import pool from '../../src/db/client.js';
import { sendPushNotification } from '../notifications/firebase.js';
import { requireUserId } from '../_lib/auth.js';
import { sendError, sendSuccess, handleUnexpectedError } from '../_lib/http.js';
import { hydrateWorkouts } from '../_lib/workouts.js';

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        const userId = await requireUserId(req);

        // SEARCH
        if (action === 'search' && req.method === 'GET') {
            const { query } = req.query;

            if (!query || query.trim().length < 2) {
                return sendError(res, 400, 'Search query must be at least 2 characters', 'VALIDATION_ERROR');
            }

            const result = await pool.query(
                `SELECT id, username, email, created_at 
                 FROM users 
                 WHERE (LOWER(username) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)) 
                 AND id != $2 
                 LIMIT 20`,
                [`%${query}%`, userId]
            );

            return sendSuccess(res, 200, { users: result.rows });
        }

        // SEND REQUEST
        if (action === 'send-request' && req.method === 'POST') {
            const { friendId } = req.body;

            if (!friendId) {
                return sendError(res, 400, 'Friend ID is required', 'VALIDATION_ERROR');
            }

            if (Number(userId) === Number(friendId)) {
                return sendError(res, 400, 'Cannot add yourself as a friend', 'VALIDATION_ERROR');
            }

            const existing = await pool.query(
                'SELECT id, status FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
                [userId, friendId]
            );

            if (existing.rows.length > 0) {
                const status = existing.rows[0].status;
                if (status === 'accepted') {
                    return sendError(res, 400, 'Already friends', 'CONFLICT');
                } else if (status === 'pending') {
                    return sendError(res, 400, 'Friend request already sent', 'CONFLICT');
                }
            }

            await pool.query(
                'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
                [userId, friendId, 'pending']
            );

            const senderResult = await pool.query(
                'SELECT username FROM users WHERE id = $1',
                [userId]
            );

            const tokensResult = await pool.query(
                'SELECT DISTINCT token FROM push_tokens WHERE user_id = $1 ORDER BY token',
                [friendId]
            );
            const tokens = tokensResult.rows.map((row) => row.token);

            await sendPushNotification({
                tokens,
                title: 'New friend request',
                message: `${senderResult.rows[0]?.username || 'Someone'} sent you a friend request.`
            });

            return sendSuccess(res, 201, { message: 'Friend request sent' });
        }

        // GET REQUESTS
        if (action === 'requests' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT f.id, f.user_id, f.created_at, u.username, u.email 
                 FROM friendships f 
                 JOIN users u ON f.user_id = u.id 
                 WHERE f.friend_id = $1 AND f.status = 'pending' 
                 ORDER BY f.created_at DESC`,
                [userId]
            );

            return sendSuccess(res, 200, { requests: result.rows });
        }

        // RESPOND TO REQUEST
        if (action === 'respond' && req.method === 'POST') {
            const { requestId, accept } = req.body;

            if (!requestId || accept === undefined) {
                return sendError(res, 400, 'Request ID and accept status required', 'VALIDATION_ERROR');
            }

            const request = await pool.query(
                'SELECT id, user_id, friend_id FROM friendships WHERE id = $1 AND friend_id = $2 AND status = $3',
                [requestId, userId, 'pending']
            );

            if (request.rows.length === 0) {
                return sendError(res, 404, 'Friend request not found', 'NOT_FOUND');
            }

            if (accept) {
                await pool.query(
                    'UPDATE friendships SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    ['accepted', requestId]
                );
                return sendSuccess(res, 200, { message: 'Friend request accepted' });
            } else {
                await pool.query('DELETE FROM friendships WHERE id = $1', [requestId]);
                return sendSuccess(res, 200, { message: 'Friend request rejected' });
            }
        }

        // GET FRIENDS LIST
        if (action === 'list' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT 
                    CASE 
                      WHEN f.user_id = $1 THEN u2.id 
                      ELSE u1.id 
                    END as friend_id,
                    CASE 
                      WHEN f.user_id = $1 THEN u2.username 
                      ELSE u1.username 
                    END as username,
                    CASE 
                      WHEN f.user_id = $1 THEN u2.email 
                      ELSE u1.email 
                    END as email,
                    f.created_at
                 FROM friendships f
                 JOIN users u1 ON f.user_id = u1.id
                 JOIN users u2 ON f.friend_id = u2.id
                 WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
                 ORDER BY f.created_at DESC`,
                [userId]
            );

            return sendSuccess(res, 200, { friends: result.rows });
        }

        // FRIEND NOTIFICATION SETTINGS
        if (action === 'notifications' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT s.friend_id, s.notify_on_workout
                 FROM friend_notification_settings s
                 JOIN friendships f
                   ON ((f.user_id = $1 AND f.friend_id = s.friend_id)
                    OR (f.friend_id = $1 AND f.user_id = s.friend_id))
                  AND f.status = 'accepted'
                 WHERE s.user_id = $1`,
                [userId]
            );

            return sendSuccess(res, 200, {
                settings: result.rows.map((row) => ({
                    friendId: row.friend_id,
                    notifyOnWorkout: row.notify_on_workout
                }))
            });
        }

        if (action === 'notifications' && req.method === 'POST') {
            const { friendId, notifyOnWorkout } = req.body;

            if (!friendId) {
                return sendError(res, 400, 'Friend ID is required', 'VALIDATION_ERROR');
            }

            const friendshipResult = await pool.query(
                `SELECT id FROM friendships 
                 WHERE status = 'accepted'
                   AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))`,
                [userId, friendId]
            );

            if (friendshipResult.rows.length === 0) {
                return sendError(res, 403, 'Not authorized to update this setting', 'FORBIDDEN');
            }

            await pool.query(
                `INSERT INTO friend_notification_settings (user_id, friend_id, notify_on_workout)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, friend_id)
                 DO UPDATE SET notify_on_workout = EXCLUDED.notify_on_workout,
                               updated_at = CURRENT_TIMESTAMP`,
                [userId, friendId, Boolean(notifyOnWorkout)]
            );

            return sendSuccess(res, 200, { message: 'Notification setting updated' });
        }

        // GET FRIEND PROFILE
        if (action === 'profile' && req.method === 'GET') {
            const { friendId } = req.query;

            if (!friendId) {
                return sendError(res, 400, 'Friend ID is required', 'VALIDATION_ERROR');
            }

            const friendshipResult = await pool.query(
                `SELECT id FROM friendships 
                 WHERE status = 'accepted'
                   AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))`,
                [userId, friendId]
            );

            if (friendshipResult.rows.length === 0) {
                return sendError(res, 403, 'Not authorized to view this profile', 'FORBIDDEN');
            }

            const profileResult = await pool.query(
                `SELECT 
                    u.id,
                    u.username,
                    u.created_at AS joined_at,
                    COUNT(DISTINCT w.id) AS total_workouts,
                    COALESCE(SUM(COALESCE(es.reps, 0) * COALESCE(es.weight, 0)), 0) AS total_volume,
                    COALESCE(SUM(COALESCE(es.distance, 0)), 0) AS total_distance
                 FROM users u
                 LEFT JOIN workouts w ON w.user_id = u.id
                 LEFT JOIN workout_exercises we ON we.workout_id = w.id
                 LEFT JOIN exercise_sets es ON es.exercise_id = we.id
                 WHERE u.id = $1
                 GROUP BY u.id`,
                [friendId]
            );

            if (profileResult.rows.length === 0) {
                return sendError(res, 404, 'Friend not found', 'NOT_FOUND');
            }

            const profile = profileResult.rows[0];

            return sendSuccess(res, 200, {
                profile: {
                    id: profile.id,
                    username: profile.username,
                    joinedAt: profile.joined_at,
                    totalWorkouts: Number(profile.total_workouts) || 0,
                    totalVolume: Number(profile.total_volume) || 0,
                    totalDistance: Number(profile.total_distance) || 0
                }
            });
        }

        // GET FRIENDS FEED
        if (action === 'feed' && req.method === 'GET') {
            const friendsResult = await pool.query(
                `SELECT 
                    CASE 
                      WHEN f.user_id = $1 THEN f.friend_id 
                      ELSE f.user_id 
                    END as friend_id
                 FROM friendships f
                 WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'`,
                [userId]
            );

            const friendIds = friendsResult.rows.map(r => r.friend_id);
            const feedUserIds = Array.from(new Set([...friendIds, userId]));

            const workoutsResult = await pool.query(
                `SELECT w.id, w.user_id, w.name, w.duration, w.date, u.username
                 FROM workouts w
                 JOIN users u ON w.user_id = u.id
                 WHERE w.user_id = ANY($1)
                   AND w.share_to_feed = TRUE
                   AND (w.user_id = $2 OR u.share_workouts = TRUE)
                   AND w.date > NOW() - INTERVAL '30 days'
                 ORDER BY w.date DESC
                 LIMIT 50`,
                [feedUserIds, userId]
            );

            const workouts = await hydrateWorkouts(pool, workoutsResult.rows);

            if (workouts.length > 0) {
                const workoutIds = workouts.map(workout => workout.id);
                const commentsResult = await pool.query(
                    `SELECT c.id, c.workout_id, c.user_id, c.comment, c.created_at, u.username
                     FROM workout_comments c
                     JOIN users u ON c.user_id = u.id
                     WHERE c.workout_id = ANY($1)
                     ORDER BY c.created_at ASC`,
                    [workoutIds]
                );

                const commentsByWorkout = commentsResult.rows.reduce((acc, comment) => {
                    if (!acc[comment.workout_id]) acc[comment.workout_id] = [];
                    acc[comment.workout_id].push({
                        id: comment.id,
                        workoutId: comment.workout_id,
                        userId: comment.user_id,
                        comment: comment.comment,
                        createdAt: comment.created_at,
                        username: comment.username
                    });
                    return acc;
                }, {});

                workouts.forEach(workout => {
                    workout.comments = commentsByWorkout[workout.id] || [];
                });
            }

            return sendSuccess(res, 200, { workouts });
        }

        // REMOVE FRIEND
        if (action === 'remove' && req.method === 'DELETE') {
            const { friendId } = req.body;

            if (!friendId) {
                return sendError(res, 400, 'Friend ID is required', 'VALIDATION_ERROR');
            }

            const result = await pool.query(
                'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
                [userId, friendId]
            );

            if (result.rowCount === 0) {
                return sendError(res, 404, 'Friendship not found', 'NOT_FOUND');
            }

            return sendSuccess(res, 200, { message: 'Friend removed successfully' });
        }

        return sendError(res, 404, 'Not found', 'NOT_FOUND');
    } catch (error) {
        if (error.status) {
            return sendError(res, error.status, error.message, error.code);
        }
        return handleUnexpectedError(res, 'Friends error', error);
    }
}
