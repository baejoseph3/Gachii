import pool from '../../src/db/client.js';
import { requireUserId } from '../_lib/auth.js';
import { sendError, sendSuccess, handleUnexpectedError } from '../_lib/http.js';

const normalizeExercises = (exercises) => {
    if (Array.isArray(exercises)) return exercises;
    if (typeof exercises === 'string') {
        try {
            const parsed = JSON.parse(exercises);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        const userId = await requireUserId(req);

        if (action === 'list' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT id, title, exercises, created_at
                 FROM custom_routines
                 WHERE user_id = $1
                 ORDER BY created_at DESC`,
                [userId]
            );

            return sendSuccess(res, 200, {
                routines: result.rows.map((row) => ({
                    id: row.id,
                    title: row.title,
                    exercises: normalizeExercises(row.exercises),
                    createdAt: row.created_at
                }))
            });
        }

        if (action === 'save' && req.method === 'POST') {
            const { title, exercises } = req.body ?? {};

            if (!title || typeof title !== 'string' || !title.trim()) {
                return sendError(res, 400, 'Routine title is required', 'VALIDATION_ERROR');
            }

            if (!Array.isArray(exercises) || exercises.length === 0) {
                return sendError(res, 400, 'Routine must include at least one exercise', 'VALIDATION_ERROR');
            }

            const result = await pool.query(
                `INSERT INTO custom_routines (user_id, title, exercises)
                 VALUES ($1, $2, $3::jsonb)
                 RETURNING id, title, exercises, created_at`,
                [userId, title.trim(), JSON.stringify(exercises)]
            );

            const row = result.rows[0];
            return sendSuccess(res, 201, {
                routine: {
                    id: row.id,
                    title: row.title,
                    exercises: normalizeExercises(row.exercises),
                    createdAt: row.created_at
                }
            });
        }

        if (action === 'update' && req.method === 'PUT') {
            const { id, title, exercises } = req.body ?? {};

            if (!id || !Number.isInteger(Number(id))) {
                return sendError(res, 400, 'Routine id is required', 'VALIDATION_ERROR');
            }

            if (!title || typeof title !== 'string' || !title.trim()) {
                return sendError(res, 400, 'Routine title is required', 'VALIDATION_ERROR');
            }

            if (!Array.isArray(exercises) || exercises.length === 0) {
                return sendError(res, 400, 'Routine must include at least one exercise', 'VALIDATION_ERROR');
            }

            const result = await pool.query(
                `UPDATE custom_routines
                 SET title = $3,
                     exercises = $4::jsonb
                 WHERE id = $1
                   AND user_id = $2
                 RETURNING id, title, exercises, created_at`,
                [Number(id), userId, title.trim(), JSON.stringify(exercises)]
            );

            if (result.rows.length === 0) {
                return sendError(res, 404, 'Routine not found', 'NOT_FOUND');
            }

            const row = result.rows[0];
            return sendSuccess(res, 200, {
                routine: {
                    id: row.id,
                    title: row.title,
                    exercises: normalizeExercises(row.exercises),
                    createdAt: row.created_at
                }
            });
        }

        if (action === 'delete' && req.method === 'DELETE') {
            const { id } = req.body ?? {};

            if (!id || !Number.isInteger(Number(id))) {
                return sendError(res, 400, 'Routine id is required', 'VALIDATION_ERROR');
            }

            const result = await pool.query(
                `DELETE FROM custom_routines
                 WHERE id = $1
                   AND user_id = $2
                 RETURNING id`,
                [Number(id), userId]
            );

            if (result.rows.length === 0) {
                return sendError(res, 404, 'Routine not found', 'NOT_FOUND');
            }

            return sendSuccess(res, 200, { deleted: true });
        }

        return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        if (error.status) {
            return sendError(res, error.status, error.message, error.code || 'REQUEST_ERROR');
        }

        return handleUnexpectedError(res, 'Custom routines error', error);
    }
}
