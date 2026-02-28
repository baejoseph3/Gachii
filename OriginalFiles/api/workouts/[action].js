import pool from '../../src/db/client.js';
import { sendPushNotification } from '../notifications/firebase.js';
import { requireUserId } from '../_lib/auth.js';
import { sendError, sendSuccess, handleUnexpectedError } from '../_lib/http.js';
import { hydrateWorkouts } from '../_lib/workouts.js';

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        const userId = await requireUserId(req);

        // SAVE
        if (action === 'save' && req.method === 'POST') {
            const { name, duration, date, exercises, shareToFeed, clientRequestId } = req.body;

            if (!date || !exercises || !Array.isArray(exercises)) {
                return sendError(res, 400, 'Invalid workout data', 'VALIDATION_ERROR');
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                const hasClientRequestIdResult = await client.query(
                    `SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'workouts'
                          AND column_name = 'client_request_id'
                    ) AS has_client_request_id`
                );
                const hasClientRequestId = hasClientRequestIdResult.rows[0]?.has_client_request_id;

                if (hasClientRequestId && clientRequestId) {
                    const existingWorkoutResult = await client.query(
                        'SELECT id FROM workouts WHERE user_id = $1 AND client_request_id = $2 LIMIT 1',
                        [userId, clientRequestId]
                    );

                    if (existingWorkoutResult.rows[0]?.id) {
                        await client.query('ROLLBACK');
                        return sendSuccess(res, 200, {
                            message: 'Workout already saved',
                            workoutId: existingWorkoutResult.rows[0].id,
                            deduplicated: true
                        });
                    }
                }

                const workoutResult = hasClientRequestId
                    ? await client.query(
                        `INSERT INTO workouts (user_id, name, duration, date, share_to_feed, client_request_id)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         RETURNING id`,
                        [
                            userId,
                            name || 'Workout',
                            duration || 0,
                            date,
                            shareToFeed !== undefined ? shareToFeed : true,
                            clientRequestId || null
                        ]
                    )
                    : await client.query(
                        'INSERT INTO workouts (user_id, name, duration, date, share_to_feed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                        [userId, name || 'Workout', duration || 0, date, shareToFeed !== undefined ? shareToFeed : true]
                    );

                const workoutId = workoutResult.rows[0].id;

                for (let i = 0; i < exercises.length; i++) {
                    const exercise = exercises[i];

                    const exerciseResult = await client.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, name, muscle_group, unit, notes, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                        [workoutId, exercise.exerciseId, exercise.name, exercise.muscleGroup, exercise.unit || 'mi', exercise.notes || null, i]
                    );

                    const exerciseDbId = exerciseResult.rows[0].id;

                    if (exercise.sets && exercise.sets.length > 0) {
                        for (let j = 0; j < exercise.sets.length; j++) {
                            const set = exercise.sets[j];
                            await client.query(
                                `INSERT INTO exercise_sets (exercise_id, reps, weight, duration_minutes, distance, order_index)
                                 VALUES ($1, $2, $3, $4, $5, $6)`,
                                [exerciseDbId, set.reps || null, set.weight || null, set.duration || null, set.distance || null, j]
                            );
                        }
                    }
                }

                await client.query('COMMIT');

                const userSettingsResult = await pool.query(
                    'SELECT username, share_workouts FROM users WHERE id = $1',
                    [userId]
                );
                const userSettings = userSettingsResult.rows[0];

                if (shareToFeed !== false && userSettings?.share_workouts !== false) {
                    const friendsToNotifyResult = await pool.query(
                        `SELECT s.user_id AS friend_id
                         FROM friend_notification_settings s
                         JOIN friendships f
                           ON ((f.user_id = $1 AND f.friend_id = s.user_id)
                            OR (f.friend_id = $1 AND f.user_id = s.user_id))
                          AND f.status = 'accepted'
                         WHERE s.friend_id = $1
                           AND s.notify_on_workout = TRUE`,
                        [userId]
                    );

                    const friendIds = friendsToNotifyResult.rows.map((row) => row.friend_id);
                    if (friendIds.length > 0) {
                        const tokensResult = await pool.query(
                            'SELECT DISTINCT token FROM push_tokens WHERE user_id = ANY($1) ORDER BY token',
                            [friendIds]
                        );
                        const tokens = tokensResult.rows.map((row) => row.token);

                        await sendPushNotification({
                            tokens,
                            title: 'New workout',
                            message: `${userSettings?.username || 'A friend'} posted ${name || 'a workout'}.`
                        });
                    }
                }

                return sendSuccess(res, 201, { message: 'Workout saved successfully', workoutId });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        // LIST
        if (action === 'list' && req.method === 'GET') {
            const workoutsResult = await pool.query(
                'SELECT id, user_id, name, duration, date, share_to_feed FROM workouts WHERE user_id = $1 ORDER BY date DESC',
                [userId]
            );

            const workouts = await hydrateWorkouts(pool, workoutsResult.rows);
            return sendSuccess(res, 200, { workouts });
        }

        // UPDATE
        if (action === 'update' && req.method === 'PUT') {
            const { id, name, duration, date, exercises, shareToFeed } = req.body;

            if (!id || !Array.isArray(exercises)) {
                return sendError(res, 400, 'Invalid workout data', 'VALIDATION_ERROR');
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                const workoutResult = await client.query(
                    'UPDATE workouts SET name = $1, duration = $2, date = $3, share_to_feed = $4 WHERE id = $5 AND user_id = $6 RETURNING id',
                    [name || 'Workout', duration || 0, date || new Date().toISOString(), shareToFeed !== undefined ? shareToFeed : true, id, userId]
                );

                if (workoutResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return sendError(res, 404, 'Workout not found', 'NOT_FOUND');
                }

                const exerciseIdsResult = await client.query(
                    'SELECT id FROM workout_exercises WHERE workout_id = $1',
                    [id]
                );

                const exerciseIds = exerciseIdsResult.rows.map(row => row.id);

                if (exerciseIds.length > 0) {
                    await client.query(
                        'DELETE FROM exercise_sets WHERE exercise_id = ANY($1::int[])',
                        [exerciseIds]
                    );
                }

                await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);

                for (let i = 0; i < exercises.length; i++) {
                    const exercise = exercises[i];

                    const exerciseResult = await client.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, name, muscle_group, unit, notes, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                        [id, exercise.exerciseId, exercise.name, exercise.muscleGroup, exercise.unit || 'mi', exercise.notes || null, i]
                    );

                    const exerciseDbId = exerciseResult.rows[0].id;

                    if (exercise.sets && exercise.sets.length > 0) {
                        for (let j = 0; j < exercise.sets.length; j++) {
                            const set = exercise.sets[j];
                            await client.query(
                                `INSERT INTO exercise_sets (exercise_id, reps, weight, duration_minutes, distance, order_index)
                                 VALUES ($1, $2, $3, $4, $5, $6)`,
                                [exerciseDbId, set.reps || null, set.weight || null, set.duration || null, set.distance || null, j]
                            );
                        }
                    }
                }

                await client.query('COMMIT');

                return sendSuccess(res, 200, { message: 'Workout updated successfully' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        // COMMENT
        if (action === 'comment' && req.method === 'POST') {
            const { workoutId, comment } = req.body;

            if (!workoutId || !comment || !comment.trim()) {
                return sendError(res, 400, 'Workout ID and comment are required', 'VALIDATION_ERROR');
            }

            const workoutResult = await pool.query(
                `SELECT w.id, w.user_id, w.name
                 FROM workouts w
                 JOIN users u ON w.user_id = u.id
                 WHERE w.id = $1 AND w.share_to_feed = TRUE AND u.share_workouts = TRUE`,
                [workoutId]
            );

            if (workoutResult.rows.length === 0) {
                return sendError(res, 404, 'Workout not found or not shareable', 'NOT_FOUND');
            }

            const ownerId = workoutResult.rows[0].user_id;

            if (ownerId !== userId) {
                const friendshipResult = await pool.query(
                    `SELECT 1
                     FROM friendships f
                     WHERE ((f.user_id = $1 AND f.friend_id = $2) OR (f.user_id = $2 AND f.friend_id = $1))
                       AND f.status = 'accepted'`,
                    [userId, ownerId]
                );

                if (friendshipResult.rows.length === 0) {
                    return sendError(res, 403, 'Not allowed to comment on this workout', 'FORBIDDEN');
                }
            }

            const insertResult = await pool.query(
                `INSERT INTO workout_comments (workout_id, user_id, comment)
                 VALUES ($1, $2, $3)
                 RETURNING id, workout_id, user_id, comment, created_at`,
                [workoutId, userId, comment.trim()]
            );

            const userResult = await pool.query(
                'SELECT username FROM users WHERE id = $1',
                [userId]
            );

            const inserted = insertResult.rows[0];

            if (ownerId !== userId) {
                const tokensResult = await pool.query(
                    'SELECT DISTINCT token FROM push_tokens WHERE user_id = $1 ORDER BY token',
                    [ownerId]
                );
                const tokens = tokensResult.rows.map((row) => row.token);

                await sendPushNotification({
                    tokens,
                    title: 'New comment',
                    message: `${userResult.rows[0]?.username || 'Someone'} commented on ${workoutResult.rows[0].name || 'your workout'}.`
                });
            }

            return sendSuccess(res, 201, {
                comment: {
                    id: inserted.id,
                    workoutId: inserted.workout_id,
                    userId: inserted.user_id,
                    comment: inserted.comment,
                    createdAt: inserted.created_at,
                    username: userResult.rows[0]?.username || 'You'
                }
            });
        }

        if (action === 'comment' && req.method === 'DELETE') {
            const { commentId } = req.body;
            if (!commentId) {
                return sendError(res, 400, 'Comment ID is required', 'VALIDATION_ERROR');
            }

            const commentResult = await pool.query(
                'SELECT id FROM workout_comments WHERE id = $1 AND user_id = $2',
                [commentId, userId]
            );

            if (commentResult.rows.length === 0) {
                return sendError(res, 404, 'Comment not found', 'NOT_FOUND');
            }

            await pool.query('DELETE FROM workout_comments WHERE id = $1', [commentId]);

            return sendSuccess(res, 200, { message: 'Comment deleted', commentId });
        }

        // DELETE
        if (action === 'delete' && req.method === 'DELETE') {
            const { id } = req.body;
            if (!id) {
                return sendError(res, 400, 'Workout ID is required', 'VALIDATION_ERROR');
            }

            const workoutResult = await pool.query(
                'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (workoutResult.rows.length === 0) {
                return sendError(res, 404, 'Workout not found', 'NOT_FOUND');
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const exerciseIdsResult = await client.query(
                    'SELECT id FROM workout_exercises WHERE workout_id = $1',
                    [id]
                );
                const exerciseIds = exerciseIdsResult.rows.map(row => row.id);

                if (exerciseIds.length > 0) {
                    await client.query(
                        'DELETE FROM exercise_sets WHERE exercise_id = ANY($1::int[])',
                        [exerciseIds]
                    );
                }

                await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);
                await client.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]);

                await client.query('COMMIT');
                return sendSuccess(res, 200, { message: 'Workout deleted successfully' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        return sendError(res, 404, 'Not found', 'NOT_FOUND');
    } catch (error) {
        if (error.status) {
            return sendError(res, error.status, error.message, error.code);
        }
        return handleUnexpectedError(res, 'Workouts error', error);
    }
}
