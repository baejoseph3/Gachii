import pool from '../../src/db/client.js';
import { requireUserId } from '../_lib/auth.js';
import { handleUnexpectedError, sendError, sendSuccess } from '../_lib/http.js';
import {
    getSupportedAchievementRuleKeys,
    listAchievementsForUser,
    upsertAchievementDefinition,
} from '../../src/db/queries/achievements.js';

const isTruthyBoolean = (value) => value === true || value === false;

const validateRuleConfig = (ruleKey, ruleConfig) => {
    if (ruleConfig !== undefined && (typeof ruleConfig !== 'object' || Array.isArray(ruleConfig) || ruleConfig === null)) {
        return 'ruleConfig must be an object';
    }

    const config = ruleConfig || {};

    if (ruleKey === 'exercise_weight_hits') {
        if (config.minWeight === undefined || Number(config.minWeight) < 0) {
            return 'exercise_weight_hits requires ruleConfig.minWeight >= 0';
        }
    }

    if (ruleKey === 'muscle_group_workouts_logged') {
        if (!config.muscleGroup || typeof config.muscleGroup !== 'string') {
            return 'muscle_group_workouts_logged requires ruleConfig.muscleGroup';
        }
    }

    return null;
};

const validateDefinitionPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return 'Payload is required';

    const { key, title, description, ruleKey, ruleTarget, points, sortOrder, isActive, ruleConfig } = payload;

    if (!key || typeof key !== 'string') return 'key is required';
    if (!title || typeof title !== 'string') return 'title is required';
    if (!description || typeof description !== 'string') return 'description is required';
    if (!ruleKey || typeof ruleKey !== 'string') return 'ruleKey is required';

    const supportedRuleKeys = getSupportedAchievementRuleKeys();
    if (!supportedRuleKeys.includes(ruleKey)) {
        return `Unsupported ruleKey. Allowed values: ${supportedRuleKeys.join(', ')}`;
    }
    const ruleConfigError = validateRuleConfig(ruleKey, ruleConfig);
    if (ruleConfigError) return ruleConfigError;
    if (ruleTarget !== undefined && (!Number.isInteger(ruleTarget) || ruleTarget < 1)) return 'ruleTarget must be an integer >= 1';
    if (points !== undefined && !Number.isInteger(points)) return 'points must be an integer';
    if (sortOrder !== undefined && !Number.isInteger(sortOrder)) return 'sortOrder must be an integer';
    if (isActive !== undefined && !isTruthyBoolean(isActive)) return 'isActive must be a boolean';

    return null;
};

const ensureAdmin = async (userId) => {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);

    return Boolean(result.rows[0]?.is_admin);
};

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        const userId = await requireUserId(req);

        if (action === 'list' && req.method === 'GET') {
            const items = await listAchievementsForUser(pool, userId);
            return sendSuccess(res, 200, { achievements: items });
        }

        if (action === 'definition' && req.method === 'POST') {
            const isAdmin = await ensureAdmin(userId);
            if (!isAdmin) {
                return sendError(res, 403, 'Only admins can manage achievement definitions', 'FORBIDDEN');
            }

            const validationMessage = validateDefinitionPayload(req.body);
            if (validationMessage) {
                return sendError(res, 400, validationMessage, 'VALIDATION_ERROR');
            }

            const definition = await upsertAchievementDefinition(pool, req.body);
            return sendSuccess(res, 200, { achievementDefinition: definition });
        }

        return sendError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        if (error.status) {
            return sendError(res, error.status, error.message, error.code || 'REQUEST_ERROR');
        }
        return handleUnexpectedError(res, 'Achievements API error', error);
    }
}
