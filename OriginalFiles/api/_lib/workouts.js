/**
 * Hydrate workout rows with their exercises and sets in a reusable shape.
 */
export const hydrateWorkouts = async (db, workoutRows) => {
    const workouts = [];

    for (const workout of workoutRows) {
        const exercisesResult = await db.query(
            'SELECT id, exercise_id, name, muscle_group, unit, notes FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index',
            [workout.id]
        );

        const exercises = [];

        for (const exercise of exercisesResult.rows) {
            const setsResult = await db.query(
                'SELECT reps, weight, duration_minutes, distance FROM exercise_sets WHERE exercise_id = $1 ORDER BY order_index',
                [exercise.id]
            );

            exercises.push({
                id: exercise.id,
                exerciseId: exercise.exercise_id,
                name: exercise.name,
                muscleGroup: exercise.muscle_group,
                unit: exercise.unit || 'mi',
                notes: exercise.notes || '',
                sets: setsResult.rows.map((set) => ({
                    reps: set.reps,
                    weight: set.weight,
                    duration: set.duration_minutes,
                    distance: set.distance
                }))
            });
        }

        workouts.push({
            id: workout.id,
            userId: workout.user_id,
            username: workout.username,
            name: workout.name,
            duration: workout.duration ?? 0,
            date: workout.date,
            shareToFeed: workout.share_to_feed,
            exercises,
            comments: []
        });
    }

    return workouts;
};
