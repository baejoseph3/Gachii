-- Adds feed sharing preferences and workout comments.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS share_workouts BOOLEAN DEFAULT TRUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS share_to_feed BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS workout_comments (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS workout_comments_workout_id_idx ON workout_comments(workout_id);
CREATE INDEX IF NOT EXISTS workout_comments_user_id_idx ON workout_comments(user_id);

-- Track cardio duration/distance per set.
ALTER TABLE exercise_sets
ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC(10,2);

ALTER TABLE exercise_sets
ADD COLUMN IF NOT EXISTS distance NUMERIC(10,2);

-- Track device push tokens for Firebase Cloud Messaging (FCM).
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);

-- Store per-friend workout notification preferences.
CREATE TABLE IF NOT EXISTS friend_notification_settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notify_on_workout BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS friend_notification_settings_user_id_idx ON friend_notification_settings(user_id);

-- Store scheduled workouts for calendar planning.
CREATE TABLE IF NOT EXISTS scheduled_workouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Scheduled workout',
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER DEFAULT 30,
    friends JSONB DEFAULT '[]'::jsonb,
    exercises JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE scheduled_workouts
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Scheduled workout';

ALTER TABLE scheduled_workouts
ADD COLUMN IF NOT EXISTS exercises JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS scheduled_workouts_user_id_idx ON scheduled_workouts(user_id);
CREATE INDEX IF NOT EXISTS scheduled_workouts_date_idx ON scheduled_workouts(date);

-- Store per-exercise notes on workout exercises.
ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Idempotency key to avoid duplicate workout saves on retries/double-submits.
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_client_request_id_idx
ON workouts(user_id, client_request_id)
WHERE client_request_id IS NOT NULL;

-- Allow custom exercises to target multiple muscle groups with primary/secondary splits.
ALTER TABLE custom_exercises
ADD COLUMN IF NOT EXISTS primary_muscle_groups JSONB,
ADD COLUMN IF NOT EXISTS secondary_muscle_groups JSONB,
ADD COLUMN IF NOT EXISTS is_cardio BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'custom_exercises'
          AND column_name = 'muscle_group'
    ) THEN
        UPDATE custom_exercises
        SET primary_muscle_groups = jsonb_build_array(muscle_group)
        WHERE primary_muscle_groups IS NULL
          AND muscle_group IS NOT NULL;

        ALTER TABLE custom_exercises
        DROP COLUMN muscle_group;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'custom_exercises'
          AND column_name = 'muscle_groups'
    ) THEN
        UPDATE custom_exercises
        SET primary_muscle_groups = muscle_groups
        WHERE primary_muscle_groups IS NULL;

        ALTER TABLE custom_exercises
        DROP COLUMN muscle_groups;
    END IF;
END $$;

UPDATE custom_exercises
SET primary_muscle_groups = '[]'::jsonb
WHERE primary_muscle_groups IS NULL;

UPDATE custom_exercises
SET secondary_muscle_groups = '[]'::jsonb
WHERE secondary_muscle_groups IS NULL;

ALTER TABLE custom_exercises
ALTER COLUMN primary_muscle_groups SET NOT NULL,
ALTER COLUMN secondary_muscle_groups SET NOT NULL,
ALTER COLUMN is_cardio SET NOT NULL;

-- Store reusable custom workout routines.
CREATE TABLE IF NOT EXISTS custom_routines (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS custom_routines_user_id_idx ON custom_routines(user_id);

-- Unified exercises library table for built-in and custom exercises.
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    primary_muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    secondary_muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE,
    is_cardio BOOLEAN NOT NULL DEFAULT FALSE,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS exercises_builtin_name_unique_idx
ON exercises (LOWER(name))
WHERE is_custom = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS exercises_user_custom_name_unique_idx
ON exercises (user_id, LOWER(name))
WHERE is_custom = TRUE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'custom_exercises'
    ) THEN
        INSERT INTO exercises (user_id, name, primary_muscle_groups, secondary_muscle_groups, is_bodyweight, is_cardio, is_custom, created_at)
        SELECT
            ce.user_id,
            ce.name,
            COALESCE(ce.primary_muscle_groups, '[]'::jsonb),
            COALESCE(ce.secondary_muscle_groups, '[]'::jsonb),
            COALESCE(ce.is_bodyweight, FALSE),
            COALESCE(ce.is_cardio, FALSE),
            TRUE,
            COALESCE(ce.created_at, CURRENT_TIMESTAMP)
        FROM custom_exercises ce
        ON CONFLICT (user_id, LOWER(name)) WHERE is_custom = TRUE
        DO NOTHING;
    END IF;
END $$;

INSERT INTO exercises (user_id, name, primary_muscle_groups, secondary_muscle_groups, is_bodyweight, is_cardio, is_custom)
VALUES
    (NULL, 'Bench Press', '["chest"]', '["triceps", "shoulders"]', FALSE, FALSE, FALSE),
    (NULL, 'Incline Bench Press', '["chest"]', '["triceps", "shoulders"]', FALSE, FALSE, FALSE),
    (NULL, 'Dumbbell Press', '["chest"]', '["triceps", "shoulders"]', FALSE, FALSE, FALSE),
    (NULL, 'Chest Fly', '["chest"]', '["shoulders"]', FALSE, FALSE, FALSE),
    (NULL, 'Push-ups', '["chest"]', '["triceps", "shoulders"]', TRUE, FALSE, FALSE),
    (NULL, 'Overhead Press', '["shoulders"]', '["triceps"]', FALSE, FALSE, FALSE),
    (NULL, 'Lateral Raise', '["shoulders"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Front Raise', '["shoulders"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Rear Delt Fly', '["shoulders"]', '["back"]', FALSE, FALSE, FALSE),
    (NULL, 'Deadlift', '["back"]', '["glutes", "hamstrings", "lower_back"]', FALSE, FALSE, FALSE),
    (NULL, 'Pull-ups', '["back"]', '["biceps"]', TRUE, FALSE, FALSE),
    (NULL, 'Barbell Row', '["back"]', '["biceps"]', FALSE, FALSE, FALSE),
    (NULL, 'Lat Pulldown', '["back"]', '["biceps"]', FALSE, FALSE, FALSE),
    (NULL, 'Cable Row', '["back"]', '["biceps"]', FALSE, FALSE, FALSE),
    (NULL, 'Barbell Curl', '["biceps"]', '["forearms"]', FALSE, FALSE, FALSE),
    (NULL, 'Dumbbell Curl', '["biceps"]', '["forearms"]', FALSE, FALSE, FALSE),
    (NULL, 'Hammer Curl', '["biceps"]', '["forearms"]', FALSE, FALSE, FALSE),
    (NULL, 'Preacher Curl', '["biceps"]', '["forearms"]', FALSE, FALSE, FALSE),
    (NULL, 'Tricep Pushdown', '["triceps"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Overhead Extension', '["triceps"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Skull Crushers', '["triceps"]', '["chest"]', FALSE, FALSE, FALSE),
    (NULL, 'Close Grip Bench', '["triceps"]', '["chest", "shoulders"]', FALSE, FALSE, FALSE),
    (NULL, 'Squat', '["quads"]', '["glutes", "hamstrings"]', FALSE, FALSE, FALSE),
    (NULL, 'Front Squat', '["quads"]', '["glutes"]', FALSE, FALSE, FALSE),
    (NULL, 'Leg Press', '["quads"]', '["glutes"]', FALSE, FALSE, FALSE),
    (NULL, 'Leg Extension', '["quads"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Lunges', '["quads"]', '["glutes", "hamstrings"]', TRUE, FALSE, FALSE),
    (NULL, 'Romanian Deadlift', '["hamstrings"]', '["glutes", "lower_back"]', FALSE, FALSE, FALSE),
    (NULL, 'Leg Curl', '["hamstrings"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Stiff Leg Deadlift', '["hamstrings"]', '["lower_back"]', FALSE, FALSE, FALSE),
    (NULL, 'Hip Thrust', '["glutes"]', '["hamstrings"]', FALSE, FALSE, FALSE),
    (NULL, 'Glute Bridge', '["glutes"]', '["hamstrings"]', FALSE, FALSE, FALSE),
    (NULL, 'Bulgarian Split Squat', '["glutes"]', '["quads"]', FALSE, FALSE, FALSE),
    (NULL, 'Cable Kickback', '["glutes"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Calf Raise', '["calves"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Seated Calf Raise', '["calves"]', '[]', FALSE, FALSE, FALSE),
    (NULL, 'Crunches', '["abs"]', '[]', TRUE, FALSE, FALSE),
    (NULL, 'Plank', '["abs"]', '[]', TRUE, FALSE, FALSE),
    (NULL, 'Leg Raises', '["abs"]', '[]', TRUE, FALSE, FALSE),
    (NULL, 'Russian Twists', '["abs"]', '[]', TRUE, FALSE, FALSE),
    (NULL, 'Treadmill Walk', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Treadmill Run', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Stairmaster', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Elliptical', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Bike', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Swim', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Rower', '[]', '[]', FALSE, TRUE, FALSE),
    (NULL, 'Outdoor Run', '[]', '[]', FALSE, TRUE, FALSE)
ON CONFLICT (LOWER(name)) WHERE is_custom = FALSE
DO NOTHING;

-- Remap historical workout exercise IDs to the unified exercises table IDs.
-- This preserves previous notes/sets lookups after moving away from hardcoded IDs.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'workout_exercises'
    ) THEN
        -- Built-in exercises: map by persisted workout exercise name.
        UPDATE workout_exercises we
        SET exercise_id = e.id::text
        FROM exercises e
        WHERE e.is_custom = FALSE
          AND LOWER(e.name) = LOWER(COALESCE(we.name, ''))
          AND (
                we.exercise_id IS NULL
                OR we.exercise_id !~ '^custom-'
              )
          AND we.exercise_id IS DISTINCT FROM e.id::text;

        -- Custom exercises: map legacy custom_exercises IDs to new exercises IDs.
        UPDATE workout_exercises we
        SET exercise_id = CONCAT('custom-', e.id)
        FROM workouts w
        JOIN custom_exercises ce
            ON ce.user_id = w.user_id
        JOIN exercises e
            ON e.user_id = w.user_id
           AND e.is_custom = TRUE
           AND LOWER(e.name) = LOWER(ce.name)
        WHERE we.workout_id = w.id
          AND we.exercise_id = CONCAT('custom-', ce.id)
          AND we.exercise_id IS DISTINCT FROM CONCAT('custom-', e.id);
    END IF;
END $$;

-- Achievements system: reusable definitions + per-user unlock records.
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rule_key TEXT NOT NULL,
    rule_target INTEGER NOT NULL DEFAULT 1,
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    points INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON user_achievements(achievement_id);

ALTER TABLE achievement_definitions
ADD COLUMN IF NOT EXISTS rule_config JSONB NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO achievement_definitions (key, title, description, rule_key, rule_target, points, sort_order, is_active)
VALUES
    ('first_workout', 'First Workout Complete', 'Finish your very first workout session.', 'workouts_completed', 1, 10, 10, TRUE),
    ('three_workouts_week', 'Consistency Starter', 'Complete 3 workouts in a single week.', 'workouts_in_week', 3, 20, 20, TRUE),
    ('ten_workouts_total', '10 Workout Milestone', 'Log 10 total workout sessions.', 'workouts_completed', 10, 50, 30, TRUE),
    ('progressive_strength', 'Strength Builder', 'Increase weight on a main lift 3 times.', 'lift_progress_events', 3, 75, 40, TRUE)
ON CONFLICT (key)
DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    rule_key = EXCLUDED.rule_key,
    rule_target = EXCLUDED.rule_target,
    points = EXCLUDED.points,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Additional achievement definitions for streaks, timing, exercise goals,
-- social engagement, scheduling, and volume milestones.
INSERT INTO achievement_definitions (key, title, description, rule_key, rule_target, rule_config, points, sort_order, is_active)
VALUES
    ('three_day_streak', '3-Day Streak', 'Log workouts on 3 consecutive days.', 'day_streak', 3, '{}'::jsonb, 0, 50, TRUE),
    ('seven_day_streak', '7-Day Streak', 'Log workouts on 7 consecutive days.', 'day_streak', 7, '{}'::jsonb, 0, 60, TRUE),
    ('morning_grinder', 'Morning Grinder', 'Log 5 workouts between 5:00 and 11:59.', 'workouts_logged_morning', 5, '{}'::jsonb, 0, 70, TRUE),
    ('evening_grinder', 'Evening Grinder', 'Log 5 workouts between 17:00 and 22:59.', 'workouts_logged_evening', 5, '{}'::jsonb, 0, 80, TRUE),
    ('bench_225', 'Bench 225', 'Log a bench set at 225 lbs or more.', 'exercise_weight_hits', 1, '{"exerciseNameContains":"bench","minWeight":225}'::jsonb, 0, 90, TRUE),
    ('community_commenter', 'Community Commenter', 'Add 10 workout feed comments.', 'feed_comments_added', 10, '{}'::jsonb, 0, 100, TRUE),
    ('chest_builder_10', 'Chest Builder', 'Log 10 workouts that include chest.', 'muscle_group_workouts_logged', 10, '{"muscleGroup":"chest"}'::jsonb, 0, 110, TRUE),
    ('planner_10', 'Workout Planner', 'Schedule 10 workouts.', 'workouts_scheduled', 10, '{}'::jsonb, 0, 120, TRUE),
    ('planner_executor_5', 'Plan Executor', 'Complete 5 scheduled workout days.', 'scheduled_workouts_completed', 5, '{}'::jsonb, 0, 130, TRUE),
    ('volume_10000', 'Volume 10K', 'Log 10,000 total volume (weight × reps).', 'volume_logged_total', 10000, '{}'::jsonb, 0, 140, TRUE)
ON CONFLICT (key)
DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    rule_key = EXCLUDED.rule_key,
    rule_target = EXCLUDED.rule_target,
    rule_config = EXCLUDED.rule_config,
    points = EXCLUDED.points,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Track activity for inactivity-based auth expiration.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE users
SET last_active_at = COALESCE(last_active_at, CURRENT_TIMESTAMP)
WHERE last_active_at IS NULL;
