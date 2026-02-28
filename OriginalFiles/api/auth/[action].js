import pool from '../../src/db/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendError, sendSuccess, handleUnexpectedError } from '../_lib/http.js';
import { requireUserId } from '../_lib/auth.js';

const toUserDto = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    share_workouts: user.share_workouts,
    is_admin: user.is_admin
});

const createToken = (user) => jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET
);

export default async function handler(req, res) {
    const { action } = req.query;

    if (action === 'login' && req.method === 'POST') {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return sendError(res, 400, 'Username/email and password are required', 'VALIDATION_ERROR');
        }

        try {
            const result = await pool.query(
                'SELECT id, username, email, password_hash, share_workouts, is_admin FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
                [identifier.trim()]
            );

            if (result.rows.length === 0) {
                return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }

            const user = result.rows[0];
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            }

            return sendSuccess(res, 200, {
                message: 'Login successful',
                token: createToken(user),
                user: toUserDto(user)
            });
        } catch (error) {
            return handleUnexpectedError(res, 'Login error', error);
        }
    }

    if (action === 'register' && req.method === 'POST') {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return sendError(res, 400, 'Username, email, and password are required', 'VALIDATION_ERROR');
        }

        if (username.trim().length < 3) {
            return sendError(res, 400, 'Username must be at least 3 characters', 'VALIDATION_ERROR');
        }

        if (password.length < 6) {
            return sendError(res, 400, 'Password must be at least 6 characters', 'VALIDATION_ERROR');
        }

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const normalizedUsername = username.trim();

            const existing = await pool.query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
                [normalizedEmail, normalizedUsername]
            );

            if (existing.rows.length > 0) {
                return sendError(res, 409, 'Email or username already exists', 'CONFLICT');
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const result = await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at, share_workouts, is_admin',
                [normalizedUsername, normalizedEmail, passwordHash]
            );

            const user = result.rows[0];

            return sendSuccess(res, 201, {
                message: 'User created successfully',
                token: createToken(user),
                user: toUserDto(user)
            });
        } catch (error) {
            return handleUnexpectedError(res, 'Register error', error);
        }
    }

    if (action === 'me' && req.method === 'GET') {
        try {
            const userId = await requireUserId(req);
            const result = await pool.query(
                'SELECT id, username, email, created_at, share_workouts, is_admin FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return sendError(res, 401, 'User not found', 'INVALID_TOKEN');
            }

            return sendSuccess(res, 200, { user: result.rows[0] });
        } catch (error) {
            if (error.status) {
                return sendError(res, error.status, error.message, error.code);
            }
            return handleUnexpectedError(res, 'Me error', error);
        }
    }

    if (action === 'settings' && req.method === 'PUT') {
        const { shareWorkouts } = req.body;

        try {
            const userId = await requireUserId(req);
            const result = await pool.query(
                'UPDATE users SET share_workouts = $1 WHERE id = $2 RETURNING id, username, email, created_at, share_workouts, is_admin',
                [shareWorkouts !== undefined ? Boolean(shareWorkouts) : true, userId]
            );

            if (result.rows.length === 0) {
                return sendError(res, 404, 'User not found', 'NOT_FOUND');
            }

            return sendSuccess(res, 200, { user: result.rows[0] });
        } catch (error) {
            if (error.status) {
                return sendError(res, error.status, error.message, error.code);
            }
            return handleUnexpectedError(res, 'Settings error', error);
        }
    }

    return sendError(res, 404, 'Not found', 'NOT_FOUND');
}
