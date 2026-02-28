import pool from '../../src/db/client.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    const { action } = req.query;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        if (action === 'register-token' && req.method === 'POST') {
            const { token: pushToken } = req.body;
            if (!pushToken) {
                return res.status(400).json({ message: 'Push token is required' });
            }

            await pool.query(
                `INSERT INTO push_tokens (user_id, token)
                 VALUES ($1, $2)
                 ON CONFLICT (token)
                 DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = CURRENT_TIMESTAMP`,
                [userId, pushToken]
            );

            return res.status(200).json({ message: 'Push token registered.' });
        }

        if (action === 'unregister-token' && req.method === 'POST') {
            const { token: pushToken } = req.body;
            if (!pushToken) {
                return res.status(400).json({ message: 'Push token is required' });
            }

            await pool.query(
                'DELETE FROM push_tokens WHERE user_id = $1 AND token = $2',
                [userId, pushToken]
            );

            return res.status(200).json({ message: 'Push token removed.' });
        }

        return res.status(404).json({ message: 'Not found' });
    } catch (error) {
        console.error('Notifications error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
