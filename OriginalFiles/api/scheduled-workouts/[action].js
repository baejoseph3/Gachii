import pool from '../../src/db/client.js';
import { requireUserId } from '../_lib/auth.js';

const scheduledWorkoutsColumnCache = {};

const checkScheduledWorkoutsColumn = async (columnName) => {
    if (columnName in scheduledWorkoutsColumnCache) {
        return scheduledWorkoutsColumnCache[columnName];
    }

    try {
        const result = await pool.query(
            `SELECT EXISTS (
                SELECT 1
                FROM pg_catalog.pg_attribute attr
                JOIN pg_catalog.pg_class cls ON cls.oid = attr.attrelid
                WHERE cls.oid = to_regclass('scheduled_workouts')
                  AND attr.attname = $1
                  AND attr.attnum > 0
                  AND NOT attr.attisdropped
            ) AS has_column`,
            [columnName]
        );
        const hasColumn = Boolean(result.rows[0]?.has_column);
        if (hasColumn) {
            scheduledWorkoutsColumnCache[columnName] = true;
        }
        return hasColumn;
    } catch (error) {
        return false;
    }
};

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        const userId = await requireUserId(req);

        if (action === 'list' && req.method === 'GET') {
            const [hasTitle, hasExercises] = await Promise.all([
                checkScheduledWorkoutsColumn('title'),
                checkScheduledWorkoutsColumn('exercises')
            ]);
            const selectClause = [
                'id',
                hasTitle ? 'title' : "'Scheduled workout' as title",
                'date',
                'time',
                'duration',
                'friends',
                hasExercises ? 'exercises' : "'[]'::jsonb as exercises"
            ].join(', ');
            const result = await pool.query(
                `SELECT ${selectClause}
                 FROM scheduled_workouts
                 WHERE user_id = $1
                 ORDER BY date ASC, time ASC`,
                [userId]
            );

            return res.status(200).json({
                scheduledWorkouts: result.rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    date: normalizeDate(row.date),
                    time: normalizeTime(row.time),
                    duration: row.duration,
                    friends: normalizeFriends(row.friends),
                    exercises: normalizeExercises(row.exercises)
                }))
            });
        }

        if (action === 'create' && req.method === 'POST') {
            const { title, date, time, duration, friends, exercises } = req.body;

            if (!date || !time) {
                return res.status(400).json({ message: 'Date and time are required.' });
            }

            const [hasTitle, hasExercises] = await Promise.all([
                checkScheduledWorkoutsColumn('title'),
                checkScheduledWorkoutsColumn('exercises')
            ]);
            const columns = ['user_id'];
            const values = ['$1'];
            const params = [userId];
            let paramIndex = params.length + 1;

            if (hasTitle) {
                columns.push('title');
                values.push(`$${paramIndex}`);
                params.push(title || 'Scheduled workout');
                paramIndex += 1;
            }

            columns.push('date', 'time', 'duration', 'friends');
            values.push(`$${paramIndex}`, `$${paramIndex + 1}`, `$${paramIndex + 2}`, `$${paramIndex + 3}`);
            params.push(date, time, duration || 30, JSON.stringify(friends || []));
            paramIndex += 4;

            if (hasExercises) {
                columns.push('exercises');
                values.push(`$${paramIndex}`);
                params.push(JSON.stringify(exercises || []));
            }

            const returnClause = [
                'id',
                hasTitle ? 'title' : "'Scheduled workout' as title",
                'date',
                'time',
                'duration',
                'friends',
                hasExercises ? 'exercises' : "'[]'::jsonb as exercises"
            ].join(', ');

            const insertQuery = `INSERT INTO scheduled_workouts (${columns.join(', ')})
                 VALUES (${values.join(', ')})
                 RETURNING ${returnClause}`;

            const result = await pool.query(insertQuery, params);

            return res.status(201).json({
                scheduledWorkout: {
                    id: result.rows[0].id,
                    title: result.rows[0].title,
                    date: normalizeDate(result.rows[0].date),
                    time: normalizeTime(result.rows[0].time),
                    duration: result.rows[0].duration,
                    friends: normalizeFriends(result.rows[0].friends),
                    exercises: normalizeExercises(result.rows[0].exercises)
                }
            });
        }

        if (action === 'delete' && req.method === 'DELETE') {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ message: 'Scheduled workout id required.' });
            }

            const result = await pool.query(
                'DELETE FROM scheduled_workouts WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Scheduled workout not found.' });
            }

            return res.status(200).json({ message: 'Scheduled workout deleted.' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        if (error?.status) {
            return res.status(error.status).json({ message: error.message });
        }

        console.error('Scheduled workout error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const normalizeFriends = (friends) => {
    if (Array.isArray(friends)) return friends;
    if (typeof friends === 'string') {
        try {
            const parsed = JSON.parse(friends);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return [];
};

const normalizeExercises = (exercises) => {
    if (Array.isArray(exercises)) return exercises;
    if (typeof exercises === 'string') {
        try {
            const parsed = JSON.parse(exercises);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return [];
};

const normalizeDate = (dateValue) => {
    if (!dateValue) return '';
    if (dateValue instanceof Date) {
        return dateValue.toISOString().slice(0, 10);
    }
    if (typeof dateValue === 'string') {
        return dateValue.slice(0, 10);
    }
    return '';
};

const normalizeTime = (timeValue) => {
    if (!timeValue) return '';
    if (typeof timeValue === 'string') {
        return timeValue.slice(0, 5);
    }
    if (timeValue instanceof Date) {
        return timeValue.toISOString().slice(11, 16);
    }
    return '';
};
