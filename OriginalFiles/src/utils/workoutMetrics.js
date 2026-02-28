/**
 * Filter workouts to the most recent seven-day window.
 */
export const getWeeklyWorkouts = (workouts) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return workouts.filter(workout => new Date(workout.date) > weekAgo);
};

/**
 * Calculate total distance and volume for the last seven days of workouts.
 */
export const getWeeklyTotals = (workouts) => {
    return getWeeklyWorkouts(workouts).reduce((totals, workout) => {
        const workoutTotals = workout.exercises.reduce((exTotals, exercise) => {
            const isCardio = (exercise.muscleGroup || '').toLowerCase() === 'cardio';
            if (isCardio) {
                const exerciseDistance = exercise.sets.reduce((setTotal, set) => {
                    const distance = parseFloat(set.distance) || 0;
                    const distanceInMiles = exercise.unit === 'km' ? distance * 0.621371 : distance;
                    return setTotal + distanceInMiles;
                }, 0);
                return { ...exTotals, distance: exTotals.distance + exerciseDistance };
            }
            const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
                const weight = parseFloat(set.weight) || 0;
                const reps = parseFloat(set.reps) || 0;
                const weightInLbs = exercise.unit === 'kg' ? weight * 2.20462 : weight;
                return setTotal + (weightInLbs * reps);
            }, 0);
            return { ...exTotals, volume: exTotals.volume + exerciseVolume };
        }, { distance: 0, volume: 0 });
        return {
            distance: totals.distance + workoutTotals.distance,
            volume: totals.volume + workoutTotals.volume
        };
    }, { distance: 0, volume: 0 });
};
