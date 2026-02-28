import pool from '../../src/db/client.js';
import jwt from 'jsonwebtoken';

const normalizeMuscleGroups = (groups) => {
    if (!Array.isArray(groups)) return [];

    return Array.from(new Set(
        groups
            .map((group) => (typeof group === 'string' ? group.trim().toLowerCase() : ''))
            .filter(Boolean)
    ));
};

const normalizePayload = ({ primaryMuscleGroups, secondaryMuscleGroups, isCardio }) => {
    const primary = normalizeMuscleGroups(primaryMuscleGroups);
    const secondaryRaw = normalizeMuscleGroups(secondaryMuscleGroups);
    const primarySet = new Set(primary);
    const secondary = secondaryRaw.filter((group) => !primarySet.has(group));

    if (isCardio) {
        return {
            primary: [],
            secondary: []
        };
    }

    return {
        primary,
        secondary
    };
};

const EXERCISE_SELECT = 'id, name, primary_muscle_groups, secondary_muscle_groups, is_bodyweight, is_cardio, is_custom';

const getExerciseLibrary = async (userId) => {
    const result = await pool.query(
        `SELECT ${EXERCISE_SELECT}
         FROM exercises
         WHERE is_custom = FALSE OR user_id = $1
         ORDER BY is_custom DESC, created_at DESC, name ASC`,
        [userId]
    );

    return result.rows;
};

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

        if (action === 'save' && req.method === 'POST') {
            const { name, primaryMuscleGroups, secondaryMuscleGroups, isBodyweight, isCardio } = req.body;
            const cardio = Boolean(isCardio);
            const normalized = normalizePayload({ primaryMuscleGroups, secondaryMuscleGroups, isCardio: cardio });

            if (!name || (!cardio && normalized.primary.length === 0)) {
                return res.status(400).json({ message: 'Name and at least one primary muscle group are required' });
            }

            const existing = await pool.query(
                'SELECT id FROM exercises WHERE user_id = $1 AND is_custom = TRUE AND LOWER(name) = LOWER($2)',
                [userId, name]
            );

            if (existing.rows.length > 0) {
                return res.status(409).json({ message: 'You already have an exercise with this name' });
            }

            const result = await pool.query(
                `INSERT INTO exercises
                 (user_id, name, primary_muscle_groups, secondary_muscle_groups, is_bodyweight, is_cardio, is_custom)
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                 RETURNING ${EXERCISE_SELECT}`,
                [
                    userId,
                    name,
                    JSON.stringify(normalized.primary),
                    JSON.stringify(normalized.secondary),
                    cardio ? false : Boolean(isBodyweight),
                    cardio
                ]
            );

            return res.status(201).json({
                message: 'Exercise created successfully',
                exercise: result.rows[0]
            });
        }

        if (action === 'list' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT ${EXERCISE_SELECT}
                 FROM exercises
                 WHERE user_id = $1 AND is_custom = TRUE
                 ORDER BY created_at DESC`,
                [userId]
            );

            const libraryExercises = await getExerciseLibrary(userId);

            return res.status(200).json({ exercises: result.rows, libraryExercises });
        }

        if (action === 'update' && req.method === 'PUT') {
            const { id, name, primaryMuscleGroups, secondaryMuscleGroups, isBodyweight, isCardio } = req.body;
            const cardio = Boolean(isCardio);
            const normalized = normalizePayload({ primaryMuscleGroups, secondaryMuscleGroups, isCardio: cardio });

            if (!id || !name || (!cardio && normalized.primary.length === 0)) {
                return res.status(400).json({ message: 'Exercise id, name, and at least one primary muscle group are required' });
            }

            const duplicate = await pool.query(
                'SELECT id FROM exercises WHERE user_id = $1 AND is_custom = TRUE AND LOWER(name) = LOWER($2) AND id <> $3',
                [userId, name, id]
            );

            if (duplicate.rows.length > 0) {
                return res.status(409).json({ message: 'You already have an exercise with this name' });
            }

            const result = await pool.query(
                `UPDATE exercises
                 SET name = $1,
                     primary_muscle_groups = $2,
                     secondary_muscle_groups = $3,
                     is_bodyweight = $4,
                     is_cardio = $5
                 WHERE id = $6 AND user_id = $7 AND is_custom = TRUE
                 RETURNING ${EXERCISE_SELECT}`,
                [
                    name,
                    JSON.stringify(normalized.primary),
                    JSON.stringify(normalized.secondary),
                    cardio ? false : Boolean(isBodyweight),
                    cardio,
                    id,
                    userId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Exercise not found' });
            }

            return res.status(200).json({
                message: 'Exercise updated successfully',
                exercise: result.rows[0]
            });
        }

        if (action === 'delete' && req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ message: 'Exercise id is required' });
            }

            const result = await pool.query(
                'DELETE FROM exercises WHERE id = $1 AND user_id = $2 AND is_custom = TRUE RETURNING id',
                [id, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Exercise not found' });
            }

            return res.status(200).json({ message: 'Exercise deleted successfully' });
        }

        return res.status(404).json({ message: 'Not found' });
    } catch (error) {
        console.error('Exercises error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
