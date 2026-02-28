const toNumber = (value) => Number.parseInt(value, 10) || 0;

const clampProgress = (current, target) => {
    if (target <= 0) return 0;
    return Math.min(current, target);
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const parseRuleConfig = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value;
};

const getConfigNumber = (config, key, fallback = 0) => {
    const parsed = Number(config?.[key]);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
};

const getConfigString = (config, key, fallback = '') => {
    const value = config?.[key];
    return typeof value === 'string' ? value : fallback;
};

/**
 * Registry of supported achievement rule keys.
 */
const RULE_RESOLVERS = {
    workouts_completed: (metrics) => metrics.workoutsCompleted,
    workouts_in_week: (metrics) => metrics.workoutsInWeek,
    day_streak: (metrics) => metrics.maxWorkoutStreakDays,
    workouts_logged_morning: (metrics) => metrics.workoutsLoggedMorning,
    workouts_logged_evening: (metrics) => metrics.workoutsLoggedEvening,
    exercise_weight_hits: (metrics, definition) => {
        const config = parseRuleConfig(definition.rule_config);
        const minWeight = getConfigNumber(config, 'minWeight', 0);
        const exerciseNameContains = normalizeText(getConfigString(config, 'exerciseNameContains', ''));

        return metrics.exerciseSetRows.filter((row) => {
            const weight = Number(row.weight) || 0;
            const name = normalizeText(row.name);
            const matchesExercise = exerciseNameContains ? name.includes(exerciseNameContains) : true;
            return matchesExercise && weight >= minWeight;
        }).length;
    },
    feed_comments_added: (metrics) => metrics.feedCommentsAdded,
    muscle_group_workouts_logged: (metrics, definition) => {
        const config = parseRuleConfig(definition.rule_config);
        const muscleGroup = normalizeText(getConfigString(config, 'muscleGroup', ''));
        if (!muscleGroup) return 0;
        return toNumber(metrics.workoutsByMuscleGroup[muscleGroup]);
    },
    workouts_scheduled: (metrics) => metrics.workoutsScheduled,
    scheduled_workouts_completed: (metrics) => metrics.scheduledWorkoutsCompleted,
    volume_logged_total: (metrics) => metrics.volumeLoggedTotal,
    lift_progress_events: (metrics) => metrics.liftProgressEvents,
};

export const getSupportedAchievementRuleKeys = () => Object.keys(RULE_RESOLVERS);

const loadAchievementDefinitions = async (db) => {
    const result = await db.query(
        `SELECT
            id,
            key,
            title,
            description,
            rule_key,
            rule_target,
            COALESCE(rule_config, '{}'::jsonb) AS rule_config
         FROM achievement_definitions
         WHERE is_active = TRUE
         ORDER BY sort_order ASC, id ASC`
    );

    return result.rows;
};

const calculateMaxDayStreak = (dateRows) => {
    if (!dateRows.length) return 0;

    let best = 1;
    let current = 1;

    for (let i = 1; i < dateRows.length; i += 1) {
        const previous = new Date(dateRows[i - 1].workout_day);
        const currentDay = new Date(dateRows[i].workout_day);

        const dayDiff = Math.round((currentDay - previous) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
            current += 1;
            best = Math.max(best, current);
        } else if (dayDiff > 1) {
            current = 1;
        }
    }

    return best;
};

const loadUserMetrics = async (db, userId) => {
    const [
        totalWorkoutsResult,
        workoutsThisWeekResult,
        workoutDaysResult,
        morningWorkoutsResult,
        eveningWorkoutsResult,
        commentsResult,
        scheduledWorkoutsResult,
        completedScheduledResult,
        volumeResult,
        exerciseSetRowsResult,
        muscleGroupCountsResult,
    ] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS total FROM workouts WHERE user_id = $1', [userId]),
        db.query(
            `SELECT COUNT(*)::int AS total
             FROM workouts
             WHERE user_id = $1
               AND date >= date_trunc('week', NOW())
               AND date < date_trunc('week', NOW()) + INTERVAL '1 week'`,
            [userId]
        ),
        db.query(
            `SELECT DISTINCT date::date AS workout_day
             FROM workouts
             WHERE user_id = $1
             ORDER BY workout_day ASC`,
            [userId]
        ),
        db.query(
            `SELECT COUNT(*)::int AS total
             FROM workouts
             WHERE user_id = $1
               AND EXTRACT(HOUR FROM date) BETWEEN 5 AND 11`,
            [userId]
        ),
        db.query(
            `SELECT COUNT(*)::int AS total
             FROM workouts
             WHERE user_id = $1
               AND EXTRACT(HOUR FROM date) BETWEEN 17 AND 22`,
            [userId]
        ),
        db.query('SELECT COUNT(*)::int AS total FROM workout_comments WHERE user_id = $1', [userId]),
        db.query('SELECT COUNT(*)::int AS total FROM scheduled_workouts WHERE user_id = $1', [userId]),
        db.query(
            `SELECT COUNT(*)::int AS total
             FROM scheduled_workouts sw
             WHERE sw.user_id = $1
               AND EXISTS (
                    SELECT 1
                    FROM workouts w
                    WHERE w.user_id = sw.user_id
                      AND w.date::date = sw.date
               )`,
            [userId]
        ),
        db.query(
            `SELECT COALESCE(SUM(COALESCE(es.weight, 0) * COALESCE(es.reps, 0)), 0)::int AS total
             FROM exercise_sets es
             JOIN workout_exercises we ON we.id = es.exercise_id
             JOIN workouts w ON w.id = we.workout_id
             WHERE w.user_id = $1`,
            [userId]
        ),
        db.query(
            `SELECT LOWER(COALESCE(we.name, '')) AS name, COALESCE(es.weight, 0) AS weight
             FROM exercise_sets es
             JOIN workout_exercises we ON we.id = es.exercise_id
             JOIN workouts w ON w.id = we.workout_id
             WHERE w.user_id = $1`,
            [userId]
        ),
        db.query(
            `SELECT LOWER(COALESCE(we.muscle_group, '')) AS muscle_group,
                    COUNT(DISTINCT we.workout_id)::int AS total
             FROM workout_exercises we
             JOIN workouts w ON w.id = we.workout_id
             WHERE w.user_id = $1
             GROUP BY LOWER(COALESCE(we.muscle_group, ''))`,
            [userId]
        ),
    ]);

    const workoutsByMuscleGroup = {};
    muscleGroupCountsResult.rows.forEach((row) => {
        const key = normalizeText(row.muscle_group);
        if (key) workoutsByMuscleGroup[key] = toNumber(row.total);
    });

    return {
        workoutsCompleted: toNumber(totalWorkoutsResult.rows[0]?.total),
        workoutsInWeek: toNumber(workoutsThisWeekResult.rows[0]?.total),
        maxWorkoutStreakDays: calculateMaxDayStreak(workoutDaysResult.rows),
        workoutsLoggedMorning: toNumber(morningWorkoutsResult.rows[0]?.total),
        workoutsLoggedEvening: toNumber(eveningWorkoutsResult.rows[0]?.total),
        feedCommentsAdded: toNumber(commentsResult.rows[0]?.total),
        workoutsScheduled: toNumber(scheduledWorkoutsResult.rows[0]?.total),
        scheduledWorkoutsCompleted: toNumber(completedScheduledResult.rows[0]?.total),
        volumeLoggedTotal: toNumber(volumeResult.rows[0]?.total),
        exerciseSetRows: exerciseSetRowsResult.rows,
        workoutsByMuscleGroup,
        liftProgressEvents: 0,
    };
};

const resolveCurrentProgress = (definition, metrics) => {
    const resolver = RULE_RESOLVERS[definition.rule_key];
    if (!resolver) return 0;
    return toNumber(resolver(metrics, definition));
};

const syncUnlocks = async (db, userId, definitions, metrics) => {
    const unlockableIds = definitions
        .filter((definition) => resolveCurrentProgress(definition, metrics) >= toNumber(definition.rule_target))
        .map((definition) => definition.id);

    if (!unlockableIds.length) return;

    await db.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         SELECT $1, id
         FROM achievement_definitions
         WHERE id = ANY($2::int[])
         ON CONFLICT (user_id, achievement_id)
         DO NOTHING`,
        [userId, unlockableIds]
    );
};

const loadUnlockedMap = async (db, userId) => {
    const result = await db.query(
        `SELECT achievement_id, achieved_at
         FROM user_achievements
         WHERE user_id = $1`,
        [userId]
    );

    return new Map(result.rows.map((row) => [row.achievement_id, row.achieved_at]));
};

export const listAchievementsForUser = async (db, userId) => {
    const definitions = await loadAchievementDefinitions(db);
    const metrics = await loadUserMetrics(db, userId);

    await syncUnlocks(db, userId, definitions, metrics);

    const unlockedMap = await loadUnlockedMap(db, userId);

    return definitions.map((definition) => {
        const progressCurrentRaw = resolveCurrentProgress(definition, metrics);
        const progressTarget = Math.max(1, toNumber(definition.rule_target));
        const achievedAt = unlockedMap.get(definition.id) || null;

        return {
            id: definition.id,
            key: definition.key,
            title: definition.title,
            description: definition.description,
            ruleKey: definition.rule_key,
            ruleConfig: parseRuleConfig(definition.rule_config),
            ruleTarget: progressTarget,
            progressCurrent: clampProgress(progressCurrentRaw, progressTarget),
            progressCurrentRaw,
            progressTarget,
            achieved: Boolean(achievedAt),
            achievedAt,
        };
    });
};

export const upsertAchievementDefinition = async (db, payload) => {
    const { key, title, description, ruleKey, ruleTarget = 1, points = 0, sortOrder = 0, isActive = true, ruleConfig = {} } = payload;

    const result = await db.query(
        `INSERT INTO achievement_definitions
            (key, title, description, rule_key, rule_target, rule_config, points, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
         ON CONFLICT (key)
         DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            rule_key = EXCLUDED.rule_key,
            rule_target = EXCLUDED.rule_target,
            rule_config = EXCLUDED.rule_config,
            points = EXCLUDED.points,
            sort_order = EXCLUDED.sort_order,
            is_active = EXCLUDED.is_active
         RETURNING id, key, title, description, rule_key, rule_target, rule_config, points, sort_order, is_active`,
        [key, title, description, ruleKey, ruleTarget, JSON.stringify(ruleConfig), points, sortOrder, isActive]
    );

    return result.rows[0];
};
