import { EXERCISE_DATA } from '../data/exerciseData';

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeKeys = (keys = []) => Array.from(new Set(
    keys
        .map((key) => (typeof key === 'string' ? key.trim().toLowerCase() : ''))
        .filter(Boolean)
));

export const getExercisePrimaryMuscleGroups = (exercise) => {
    const primary = normalizeKeys(toArray(exercise?.primary_muscle_groups));
    if (primary.length > 0) {
        return primary;
    }

    return [];
};

export const getExerciseSecondaryMuscleGroups = (exercise) => {
    const secondary = normalizeKeys(toArray(exercise?.secondary_muscle_groups));
    const primarySet = new Set(getExercisePrimaryMuscleGroups(exercise));
    return secondary.filter((key) => !primarySet.has(key));
};

export const getExerciseMuscleGroups = (exercise) => {
    if (exercise?.is_cardio || exercise?.isCardio) {
        return ['cardio'];
    }

    return normalizeKeys([
        ...getExercisePrimaryMuscleGroups(exercise),
        ...getExerciseSecondaryMuscleGroups(exercise)
    ]);
};

const keyToName = (key) => EXERCISE_DATA[key]?.name || key;

export const getExerciseMuscleGroupNames = (exercise) => getExerciseMuscleGroups(exercise).map(keyToName);

export const getPrimaryMuscleGroupNames = (exercise) => getExercisePrimaryMuscleGroups(exercise).map(keyToName);

export const getSecondaryMuscleGroupNames = (exercise) => getExerciseSecondaryMuscleGroups(exercise).map(keyToName);

export const getMuscleGroupsLabel = (exercise) => {
    if (exercise?.is_cardio || exercise?.isCardio) {
        return 'Cardio';
    }

    return getExerciseMuscleGroupNames(exercise).join(', ');
};

export const hasCardioMuscleGroup = (exercise) => Boolean(exercise?.is_cardio || exercise?.isCardio);

export const getPrimaryMuscleGroupKey = (exercise) => getExercisePrimaryMuscleGroups(exercise)[0] || '';

export const buildMergedExerciseData = (exerciseDataOrExercises = EXERCISE_DATA, maybeExercises = []) => {
    const exerciseData = Array.isArray(exerciseDataOrExercises)
        ? EXERCISE_DATA
        : (exerciseDataOrExercises || EXERCISE_DATA);
    const exercises = Array.isArray(exerciseDataOrExercises)
        ? exerciseDataOrExercises
        : maybeExercises;

    const mergedExerciseData = Object.fromEntries(
        Object.entries(exerciseData).map(([groupKey, group]) => [
            groupKey,
            {
                ...group,
                exercises: []
            }
        ])
    );
    const seenByGroup = {};

    exercises.forEach((exercise) => {
        const groupKeys = getExerciseMuscleGroups(exercise);
        const id = exercise?.is_custom ? `custom-${exercise.id}` : String(exercise.id);
        const item = {
            id,
            name: exercise.name,
            isBodyweight: Boolean(exercise.is_bodyweight)
        };

        groupKeys.forEach((groupKey) => {
            if (!mergedExerciseData[groupKey]) {
                mergedExerciseData[groupKey] = {
                    name: keyToName(groupKey),
                    color: 'gray',
                    exercises: []
                };
            }

            if (!seenByGroup[groupKey]) {
                seenByGroup[groupKey] = new Set();
            }

            if (seenByGroup[groupKey].has(item.id)) {
                return;
            }

            seenByGroup[groupKey].add(item.id);
            mergedExerciseData[groupKey].exercises.push(item);
        });
    });

    Object.values(mergedExerciseData).forEach((group) => {
        group.exercises.sort((a, b) => a.name.localeCompare(b.name));
    });

    return mergedExerciseData;
};
