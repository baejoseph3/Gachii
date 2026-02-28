import pool from '../../src/db/client.js';
import { sendPushNotification } from '../notifications/firebase.js';
import { requireUserId } from '../_lib/auth.js';

const ensureAdmin = async (userId) => {
    const result = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0]?.is_admin === true;
};

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        const userId = await requireUserId(req);

        const isAdmin = await ensureAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        if (action === 'list' && req.method === 'GET') {
            const adminsResult = await pool.query(
                'SELECT id, username, email, created_at FROM users WHERE is_admin = TRUE ORDER BY username'
            );
            return res.status(200).json({ admins: adminsResult.rows });
        }

        if (action === 'add' && req.method === 'POST') {
            const { userId: targetUserId } = req.body;

            if (!targetUserId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const result = await pool.query(
                'UPDATE users SET is_admin = TRUE WHERE id = $1 RETURNING id, username, email',
                [targetUserId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json({ admin: result.rows[0] });
        }

        if (action === 'remove' && req.method === 'POST') {
            const { userId: targetUserId } = req.body;

            if (!targetUserId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const result = await pool.query(
                'UPDATE users SET is_admin = FALSE WHERE id = $1 RETURNING id, username, email',
                [targetUserId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json({ admin: result.rows[0] });
        }

        if (action === 'push-test' && req.method === 'POST') {
            const { userId, userIds, sendToAll, title, body } = req.body;
            const rawUserIds = Array.isArray(userIds)
                ? userIds
                : typeof userIds === 'string'
                    ? userIds.split(',')
                    : userId
                        ? [userId]
                        : [];
            const parsedUserIds = rawUserIds
                .map((value) => Number(String(value).trim()))
                .filter((value) => Number.isInteger(value) && value > 0);

            if (!sendToAll && parsedUserIds.length === 0) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const tokensResult = sendToAll
                ? await pool.query('SELECT DISTINCT token FROM push_tokens ORDER BY token')
                : await pool.query(
                    'SELECT DISTINCT token FROM push_tokens WHERE user_id = ANY($1) ORDER BY token',
                    [parsedUserIds]
                );
            const tokens = tokensResult.rows.map((row) => row.token);

            const result = await sendPushNotification({
                tokens,
                title: title || 'Notification',
                message: body || 'Notification from admin dashboard.'
            });

            if (!result.ok) {
                return res.status(500).json({
                    message: result.error || 'Failed to send push notification.',
                    debug: result.data || null
                });
            }

            if (result.data?.failures?.length) {
                const invalidTokens = result.data.failures
                    .filter((failure) => {
                        const code = String(failure?.code || '').toLowerCase();
                        const errorText = String(failure?.error || '').toLowerCase();
                        return code.includes('registration-token-not-registered')
                            || code.includes('invalid-argument')
                            || errorText.includes('not registered')
                            || errorText.includes('invalid argument');
                    })
                    .map((failure) => failure.token);
                if (invalidTokens.length) {
                    await pool.query(
                        'DELETE FROM push_tokens WHERE token = ANY($1)',
                        [invalidTokens]
                    );
                }
            }

            return res.status(200).json({
                message: 'Push notification sent.',
                debug: result.data || null
            });
        }

        return res.status(404).json({ message: 'Not found' });
    } catch (error) {
        if (error?.status) {
            return res.status(error.status).json({ message: error.message, code: error.code });
        }

        console.error('Admin error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
