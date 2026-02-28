import jwt from 'jsonwebtoken';
import pool from '../../src/db/client.js';

const INACTIVITY_WINDOW_SQL = "INTERVAL '7 days'";
let hasLastActiveColumn = true;
let warnedMissingColumn = false;

const shouldBypassInactivityCheck = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === '42703' || message.includes('last_active_at');
};

/**
 * Read and verify the bearer token from a request.
 * Throws an Error with status/code for predictable handler responses.
 */
export const requireUserId = async (req) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('No token provided');
        error.status = 401;
        error.code = 'AUTH_REQUIRED';
        throw error;
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        const tokenError = new Error('Invalid or expired token');
        tokenError.status = 401;
        tokenError.code = 'INVALID_TOKEN';
        throw tokenError;
    }

    if (!hasLastActiveColumn) {
        return decoded.id;
    }

    try {
        const activeUserResult = await pool.query(
            `UPDATE users
             SET last_active_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND COALESCE(last_active_at, CURRENT_TIMESTAMP) >= CURRENT_TIMESTAMP - ${INACTIVITY_WINDOW_SQL}
             RETURNING id`,
            [decoded.id]
        );

        if (activeUserResult.rows.length === 0) {
            const userExistsResult = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.id]);

            if (userExistsResult.rows.length === 0) {
                const error = new Error('User not found');
                error.status = 401;
                error.code = 'INVALID_TOKEN';
                throw error;
            }

            const error = new Error('Session expired due to inactivity');
            error.status = 401;
            error.code = 'INACTIVE_SESSION';
            throw error;
        }

        return decoded.id;
    } catch (error) {
        if (error?.status) {
            throw error;
        }

        if (shouldBypassInactivityCheck(error)) {
            hasLastActiveColumn = false;
            if (!warnedMissingColumn) {
                warnedMissingColumn = true;
                console.warn('users.last_active_at column missing; bypassing inactivity check until migration is applied.');
            }
            return decoded.id;
        }

        throw error;
    }
};
