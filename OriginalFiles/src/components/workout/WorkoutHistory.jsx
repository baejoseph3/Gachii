import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Clock, Ruler, Weight, Pencil, Plus, PlusCircle, Repeat, X, Check, Trash2 } from 'lucide-react';
import { ExerciseCard } from './ExerciseCard';
import { MuscleGroupFolder } from './MuscleGroupFolder';
import { buildMergedExerciseData, getMuscleGroupsLabel, hasCardioMuscleGroup, getPrimaryMuscleGroupNames, getSecondaryMuscleGroupNames } from '../../utils/customExercises';
import { formatDistance, formatVolume } from '../../utils/formatters';
import { useScrollLock } from '../../hooks/useScrollLock';

const formatDuration = (seconds) => {
    if (!seconds) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
};

const toLocalDateValue = (value) => {
    const dateValue = value ? new Date(value) : new Date();
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toLocalTimeValue = (value) => {
    const dateValue = value ? new Date(value) : new Date();
    const hours = String(dateValue.getHours()).padStart(2, '0');
    const minutes = String(dateValue.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const toISOStringFromLocalInputs = (dateInput, timeInput) => {
    if (!dateInput || !timeInput) {
        return new Date().toISOString();
    }

    const [year, month, day] = dateInput.split('-').map(Number);
    const [hours, minutes] = timeInput.split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0).toISOString();
};

const isCardioExercise = (exercise) => Boolean(exercise?.isCardio || (exercise.muscleGroup || '').toLowerCase() === 'cardio');

const calculateTotals = (exercises) => {
    if (!exercises || exercises.length === 0) return { distance: 0, volume: 0 };

    return exercises.reduce((totals, exercise) => {
        if (!exercise.sets || exercise.sets.length === 0) return totals;

        if (isCardioExercise(exercise)) {
            const exerciseDistance = exercise.sets.reduce((setTotal, set) => {
                const distance = parseFloat(set.distance) || 0;
                const distanceInMiles = exercise.unit === 'km' ? distance * 0.621371 : distance;
                return setTotal + distanceInMiles;
            }, 0);
            return { ...totals, distance: totals.distance + exerciseDistance };
        }

        const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseFloat(set.reps) || 0;
            const weightInLbs = exercise.unit === 'kg' ? weight * 2.20462 : weight;
            return setTotal + (weightInLbs * reps);
        }, 0);
        return { ...totals, volume: totals.volume + exerciseVolume };
    }, { distance: 0, volume: 0 });
};

const ensureSetId = (set, index) => ({
    id: set.id ?? `${Date.now()}-${Math.random()}-${index}`,
    duration: set.duration ?? '',
    distance: set.distance ?? '',
    reps: set.reps ?? '',
    weight: set.weight ?? ''
});

export const WorkoutHistory = ({
    workouts,
    onUpdateWorkout,
    onDeleteWorkout,
    onRepeatWorkout,
    customExercises = [],
    onEditWorkoutToggle,
    onCreateExercise,
    pendingCreatedExercise,
    onPendingCreatedExerciseHandled
}) => {
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [editDuration, setEditDuration] = useState({ hours: '', minutes: '' });
    const [editDateTime, setEditDateTime] = useState(() => ({
        date: toLocalDateValue(),
        time: toLocalTimeValue()
    }));
    const [editError, setEditError] = useState('');
    const [showExerciseList, setShowExerciseList] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [exerciseSearch, setExerciseSearch] = useState('');

    useScrollLock(Boolean(editingWorkout));

    useEffect(() => {
        onEditWorkoutToggle?.(Boolean(editingWorkout));
    }, [editingWorkout, onEditWorkoutToggle]);


    useEffect(() => {
        if (!pendingCreatedExercise || !editingWorkout) {
            return;
        }

        const muscleGroupName = getMuscleGroupsLabel(pendingCreatedExercise);
        const cardio = hasCardioMuscleGroup(pendingCreatedExercise);

        setEditingWorkout((prev) => {
            if (!prev) {
                return prev;
            }

            return {
                ...prev,
                exercises: [
                    ...prev.exercises,
                    {
                        id: Date.now() + Math.random(),
                        exerciseId: `custom-${pendingCreatedExercise.id}`,
                        name: pendingCreatedExercise.name,
                        muscleGroup: muscleGroupName,
                        primaryMuscleGroups: getPrimaryMuscleGroupNames(pendingCreatedExercise),
                        secondaryMuscleGroups: getSecondaryMuscleGroupNames(pendingCreatedExercise),
                        isCardio: cardio,
                        isBodyweight: Boolean(pendingCreatedExercise.is_bodyweight),
                        unit: cardio ? 'mi' : 'lbs',
                        notes: '',
                        sets: [ensureSetId(cardio ? { duration: '', distance: '' } : { reps: '', weight: '' }, 0)]
                    }
                ]
            };
        });

        setShowExerciseList(false);
        onPendingCreatedExerciseHandled?.();
    }, [editingWorkout, onPendingCreatedExerciseHandled, pendingCreatedExercise]);

    const mergedExerciseData = useMemo(() => buildMergedExerciseData(customExercises), [customExercises]);

    const filteredExerciseData = useMemo(() => {
        const term = exerciseSearch.trim().toLowerCase();
        if (!term) return mergedExerciseData;

        return Object.entries(mergedExerciseData).reduce((acc, [groupKey, group]) => {
            const filteredExercises = group.exercises.filter((exercise) =>
                exercise.name.toLowerCase().includes(term)
            );

            if (filteredExercises.length > 0) {
                acc[groupKey] = {
                    ...group,
                    exercises: filteredExercises
                };
            }

            return acc;
        }, {});
    }, [exerciseSearch, mergedExerciseData]);

    const searchResults = useMemo(() => {
        const term = exerciseSearch.trim().toLowerCase();
        if (!term) {
            return [];
        }

        const uniqueResults = new Map();

        Object.entries(mergedExerciseData).forEach(([groupKey, group]) => {
            group.exercises
                .filter((exercise) => exercise.name.toLowerCase().includes(term))
                .forEach((exercise) => {
                    if (!uniqueResults.has(exercise.id)) {
                        uniqueResults.set(exercise.id, {
                            groupKey,
                            exercise
                        });
                    }
                });
        });

        return Array.from(uniqueResults.values());
    }, [exerciseSearch, mergedExerciseData]);

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const toggleExercise = (exerciseKey) => {
        setSelectedExercises(prev => (
            prev.includes(exerciseKey)
                ? prev.filter(key => key !== exerciseKey)
                : [...prev, exerciseKey]
        ));
    };

    const createExerciseFromKey = (exerciseKey) => {
        const firstHyphen = exerciseKey.indexOf('-');
        const exerciseId = exerciseKey.substring(firstHyphen + 1);

        if (exerciseId.startsWith('custom-')) {
            const numericId = exerciseId.replace('custom-', '');
            const customExercise = customExercises.find((exercise) => String(exercise.id) === numericId);

            if (!customExercise) {
                console.error('Custom exercise not found:', numericId);
                return null;
            }

            const muscleGroupName = getMuscleGroupsLabel(customExercise);
            const cardio = hasCardioMuscleGroup(customExercise);

            return {
                id: Date.now() + Math.random(),
                exerciseId: `custom-${customExercise.id}`,
                name: customExercise.name,
                muscleGroup: muscleGroupName,
                primaryMuscleGroups: getPrimaryMuscleGroupNames(customExercise),
                secondaryMuscleGroups: getSecondaryMuscleGroupNames(customExercise),
                isCardio: cardio,
                isBodyweight: Boolean(customExercise.is_bodyweight),
                unit: cardio ? 'mi' : 'lbs',
                notes: '',
                sets: [ensureSetId(cardio ? { duration: '', distance: '' } : { reps: '', weight: '' }, 0)]
            };
        }

        const libraryExercise = customExercises.find((exercise) => String(exercise.id) === exerciseId && !exercise.is_custom);
        if (!libraryExercise) {
            console.error('Exercise not found:', exerciseId);
            return null;
        }

        const cardio = hasCardioMuscleGroup(libraryExercise);

        return {
            id: Date.now() + Math.random(),
            exerciseId: String(libraryExercise.id),
            name: libraryExercise.name,
            muscleGroup: getMuscleGroupsLabel(libraryExercise),
            primaryMuscleGroups: getPrimaryMuscleGroupNames(libraryExercise),
            secondaryMuscleGroups: getSecondaryMuscleGroupNames(libraryExercise),
            isCardio: cardio,
            isBodyweight: Boolean(libraryExercise.is_bodyweight),
            unit: cardio ? 'mi' : 'lbs',
            notes: '',
            sets: [ensureSetId(cardio ? { duration: '', distance: '' } : { reps: '', weight: '' }, 0)]
        };
    };

    const startEditingWorkout = (workout) => {
        const duration = workout.duration || 0;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        setEditingWorkout({
            ...workout,
            shareToFeed: workout.shareToFeed ?? true,
            exercises: (workout.exercises || []).map((exercise) => {
                const customMatch = typeof exercise.exerciseId === 'string' && exercise.exerciseId.startsWith('custom-')
                    ? customExercises.find((customExercise) => `custom-${customExercise.id}` === exercise.exerciseId)
                    : null;
                const builtinMatch = !customMatch
                    ? customExercises.find((libraryExercise) => String(libraryExercise.id) === String(exercise.exerciseId) && !libraryExercise.is_custom)
                    : null;
                const exerciseDefinition = customMatch || builtinMatch;

                return {
                    ...exercise,
                    primaryMuscleGroups: exercise.primaryMuscleGroups ?? (exerciseDefinition ? getPrimaryMuscleGroupNames(exerciseDefinition) : []),
                    secondaryMuscleGroups: exercise.secondaryMuscleGroups ?? (exerciseDefinition ? getSecondaryMuscleGroupNames(exerciseDefinition) : []),
                    isCardio: typeof exercise.isCardio === 'boolean' ? exercise.isCardio : Boolean(exerciseDefinition ? hasCardioMuscleGroup(exerciseDefinition) : false),
                    notes: exercise.notes ?? '',
                    sets: (exercise.sets || []).map(ensureSetId)
                };
            })
        });
        setEditDuration({
            hours: hours ? hours.toString() : '',
            minutes: minutes ? minutes.toString() : ''
        });
        setEditDateTime({
            date: toLocalDateValue(workout.date),
            time: toLocalTimeValue(workout.date)
        });
        setEditError('');
        setShowExerciseList(false);
        setSelectedExercises([]);
        setExpandedGroups({});
        setExerciseSearch('');
    };

    const closeEditing = () => {
        setEditingWorkout(null);
        setEditDuration({ hours: '', minutes: '' });
        setEditDateTime({
            date: toLocalDateValue(),
            time: toLocalTimeValue()
        });
        setEditError('');
        setShowExerciseList(false);
        setSelectedExercises([]);
        setExpandedGroups({});
        setExerciseSearch('');
    };

    const updateWorkoutField = (field, value) => {
        setEditingWorkout(prev => ({ ...prev, [field]: value }));
    };

    const updateSetField = (exerciseIndex, setIndex, field, value) => {
        setEditingWorkout(prev => {
            const updatedExercises = [...prev.exercises];
            const updatedSets = [...(updatedExercises[exerciseIndex].sets || [])];
            updatedSets[setIndex] = {
                ...updatedSets[setIndex],
                [field]: value
            };
            updatedExercises[exerciseIndex] = {
                ...updatedExercises[exerciseIndex],
                sets: updatedSets
            };
            return { ...prev, exercises: updatedExercises };
        });
    };

    const updateExerciseNotes = (exerciseIndex, notes) => {
        setEditingWorkout(prev => {
            const updatedExercises = [...prev.exercises];
            updatedExercises[exerciseIndex] = {
                ...updatedExercises[exerciseIndex],
                notes
            };
            return { ...prev, exercises: updatedExercises };
        });
    };

    const addSet = (exerciseIndex) => {
        setEditingWorkout(prev => {
            const updatedExercises = [...prev.exercises];
            const updatedSets = [...(updatedExercises[exerciseIndex].sets || [])];
            const cardio = isCardioExercise(updatedExercises[exerciseIndex]);
            updatedSets.push(ensureSetId(cardio ? { duration: '', distance: '' } : { reps: '', weight: '' }, updatedSets.length));
            updatedExercises[exerciseIndex] = {
                ...updatedExercises[exerciseIndex],
                sets: updatedSets
            };
            return { ...prev, exercises: updatedExercises };
        });
    };

    const removeSet = (exerciseIndex, setIndex) => {
        setEditingWorkout(prev => {
            const updatedExercises = [...prev.exercises];
            const updatedSets = [...(updatedExercises[exerciseIndex].sets || [])];
            updatedSets.splice(setIndex, 1);
            updatedExercises[exerciseIndex] = {
                ...updatedExercises[exerciseIndex],
                sets: updatedSets
            };
            return { ...prev, exercises: updatedExercises };
        });
    };

    const removeExercise = (exerciseIndex) => {
        setEditingWorkout(prev => {
            const updatedExercises = [...prev.exercises];
            updatedExercises.splice(exerciseIndex, 1);
            return { ...prev, exercises: updatedExercises };
        });
    };

    const toggleUnit = (exerciseIndex) => {
        setEditingWorkout(prev => {
            const updatedExercises = [...prev.exercises];
            const cardio = isCardioExercise(updatedExercises[exerciseIndex]);
            const currentUnit = updatedExercises[exerciseIndex].unit || (cardio ? 'mi' : 'lbs');
            updatedExercises[exerciseIndex] = {
                ...updatedExercises[exerciseIndex],
                unit: cardio
                    ? (currentUnit === 'mi' ? 'km' : 'mi')
                    : (currentUnit === 'lbs' ? 'kg' : 'lbs')
            };
            return { ...prev, exercises: updatedExercises };
        });
    };

    const confirmExercises = () => {
        if (!selectedExercises.length) return;

        const newExercises = selectedExercises
            .map(createExerciseFromKey)
            .filter(exercise => exercise !== null);

        setEditingWorkout(prev => ({
            ...prev,
            exercises: [...prev.exercises, ...newExercises]
        }));

        setShowExerciseList(false);
        setSelectedExercises([]);
        setExpandedGroups({});
        setExerciseSearch('');
    };

    const handleSave = async () => {
        if (!editingWorkout || !onUpdateWorkout) return;

        if (!editingWorkout.exercises || editingWorkout.exercises.length === 0) {
            setEditError('Add at least one exercise before saving.');
            return;
        }

        const hours = parseInt(editDuration.hours, 10) || 0;
        const minutes = parseInt(editDuration.minutes, 10) || 0;
        const updatedWorkout = {
            ...editingWorkout,
            duration: (hours * 3600) + (minutes * 60),
            date: toISOStringFromLocalInputs(editDateTime.date, editDateTime.time)
        };

        await onUpdateWorkout(updatedWorkout);
        closeEditing();
    };
    if (workouts.length === 0) {
        return (
            <div className="bg-gray-700/30 rounded-xl p-8 text-center border border-gray-700">
                <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No workouts logged yet. Start your first workout!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {workouts.slice(0, 5).map((workout) => {
                const totals = calculateTotals(workout.exercises);
                const durationSeconds = Number.isFinite(workout.duration) ? workout.duration : 0;
                const startedTime = new Date(workout.date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                });

                return (
                    <div key={workout.id} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                        <div className="mb-4 space-y-2">
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-600/80">
                                <div className="text-white font-bold text-lg leading-tight">
                                    {workout.name || 'Workout'}
                                </div>

                                <div className="flex items-center gap-2">
                                    {onUpdateWorkout && (
                                        <button
                                            type="button"
                                            onClick={() => startEditingWorkout(workout)}
                                            className="flex min-h-8 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-600/30 px-3 py-1 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-600/50 hover:text-white"
                                        >
                                            <Pencil size={12} />
                                            Edit
                                        </button>
                                    )}
                                    {onRepeatWorkout && (
                                        <button
                                            type="button"
                                            onClick={() => onRepeatWorkout(workout)}
                                            className="flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-600/40 hover:text-white"
                                            aria-label="Repeat"
                                            title="Repeat"
                                        >
                                            <Repeat size={12} />
                                            Repeat
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="text-gray-300 font-semibold mb-1">
                                    {new Date(workout.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                                    <span>{startedTime}</span>
                                    <div className="flex items-center gap-1 text-blue-400">
                                        <Clock size={14} />
                                        <span className="font-medium">{formatDuration(durationSeconds)}</span>
                                    </div>
                                    {totals.distance > 0 && (
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <Ruler size={14} />
                                            <span>{formatDistance(totals.distance)} mi</span>
                                        </div>
                                    )}
                                    {totals.volume > 0 && (
                                        <div className="flex items-center gap-1 text-purple-400">
                                            <Weight size={14} />
                                            <span>{formatVolume(totals.volume)} lbs</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {workout.exercises && workout.exercises.map((ex, idx) => (
                                <span key={idx} className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                  {ex.name} ({ex.sets ? ex.sets.length : 0} sets)
                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
            {editingWorkout && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 shadow-2xl w-full h-full overflow-y-auto pb-32">
                        <div className="fixed top-0 left-0 right-0 z-20 bg-gray-900/95 backdrop-blur-sm pt-safe-top">
                            <div className="px-6 pt-4 pb-4 flex items-center justify-between border-b border-gray-800">
                                <div className="flex items-center gap-2 text-white font-bold text-lg">
                                    <Dumbbell size={20} className="text-blue-500" />
                                    Edit Workout
                                </div>
                            </div>
                        </div>
                        <div className="p-6 pt-[calc(env(safe-area-inset-top)+5.25rem)]">

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Workout Name</label>
                                    <input
                                        type="text"
                                        value={editingWorkout.name || ''}
                                        onChange={(event) => updateWorkoutField('name', event.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="Workout name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                    <div className="min-w-0">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                                        <input
                                            type="date"
                                            value={editDateTime.date}
                                            onChange={(event) => setEditDateTime(prev => ({ ...prev, date: event.target.value }))}
                                            className="min-w-0 w-full max-w-full appearance-none bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
                                        <input
                                            type="time"
                                            value={editDateTime.time}
                                            onChange={(event) => setEditDateTime(prev => ({ ...prev, time: event.target.value }))}
                                            className="min-w-0 w-full max-w-full appearance-none bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">Hours</div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editDuration.hours}
                                                onChange={(event) => setEditDuration(prev => ({ ...prev, hours: event.target.value }))}
                                                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">Minutes</div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editDuration.minutes}
                                                onChange={(event) => setEditDuration(prev => ({ ...prev, minutes: event.target.value }))}
                                                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 text-sm text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={editingWorkout.shareToFeed ?? true}
                                        onChange={(event) => updateWorkoutField('shareToFeed', event.target.checked)}
                                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600"
                                    />
                                    Share this workout to your social feed
                                </label>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-300">Exercises</div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowExerciseList(true);
                                                setExerciseSearch('');
                                            }}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                                        >
                                            <Plus size={16} />
                                            Add Exercise
                                        </button>
                                    </div>

                                    {editingWorkout.exercises.map((exercise, exerciseIndex) => (
                                        <ExerciseCard
                                            key={exercise.id || exerciseIndex}
                                            exercise={exercise}
                                            exerciseIndex={exerciseIndex}
                                            onAddSet={addSet}
                                            onUpdateSet={updateSetField}
                                            onRemoveSet={removeSet}
                                            onRemoveExercise={removeExercise}
                                            onToggleUnit={toggleUnit}
                                            onUpdateExerciseNotes={updateExerciseNotes}
                                        />
                                    ))}
                                </div>

                                {editError && (
                                    <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-3">
                                        {editError}
                                    </div>
                                )}
                                <div className="pt-4 border-t border-gray-800 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!editingWorkout) return;
                                            if (!window.confirm('Delete this workout? This cannot be undone.')) return;
                                            try {
                                                await onDeleteWorkout?.(editingWorkout.id);
                                                closeEditing();
                                            } catch (error) {
                                                console.error('Failed to delete workout:', error);
                                            }
                                        }}
                                        className="flex items-center gap-2 text-sm font-semibold text-red-200 hover:text-white bg-red-600/20 hover:bg-red-600/40 px-4 py-2 rounded-lg border border-red-500/40 transition-colors"
                                        disabled={!onDeleteWorkout}
                                    >
                                        <Trash2 size={16} />
                                        Delete Workout
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div
                            className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3"
                            //style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                        >
                            <button
                                type="button"
                                onClick={closeEditing}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <Check size={18} />
                                Save
                            </button>
                        </div>

                        {showExerciseList && (
                            <div className="fixed inset-0 z-40 min-h-screen bg-gray-900 pb-32">
                                <div className="pt-safe-top pt-4 fixed top-0 left-0 right-0 z-20 bg-gray-900 border-b border-gray-800">
                                    <div
                                        className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gray-900"
                                        aria-hidden="true"
                                    ></div>
                                    <div className="relative flex justify-between items-center px-4 pb-2">
                                        <h2 className="text-lg font-semibold text-white">Add Exercise</h2>
                                        <button
                                            type="button"
                                            onClick={() => onCreateExercise?.()}
                                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all active:scale-95"
                                        >
                                            <PlusCircle size={16} />
                                            <span className="text-sm">Create</span>
                                        </button>
                                    </div>

                                    <div className="px-4 pb-3">
                                        <label className="sr-only" htmlFor="edit-workout-exercise-search">Search exercises</label>
                                        <div className="relative">
                                            <input
                                                id="edit-workout-exercise-search"
                                                type="search"
                                                value={exerciseSearch}
                                                onChange={(event) => setExerciseSearch(event.target.value)}
                                                placeholder="Search exercises"
                                                className="w-full rounded-xl bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500 px-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            {exerciseSearch.trim() && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExerciseSearch('')}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 flex items-center justify-center text-gray-400 hover:text-white"
                                                    aria-label="Clear exercise search"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="px-4 h-full overflow-y-auto"
                                    style={{
                                        paddingTop: 'calc(env(safe-area-inset-top) + 136px)',
                                        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)'
                                    }}
                                >
                                    <div className="space-y-2">
                                        {exerciseSearch.trim()
                                            ? (
                                                <>
                                                    {searchResults.length === 0 ? (
                                                        <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-6 text-center text-gray-400">
                                                            No exercises match your search.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {searchResults.map(({ groupKey, exercise }) => {
                                                                const exerciseKey = `${groupKey}-${exercise.id}`;
                                                                const isSelected = selectedExercises.includes(exerciseKey);

                                                                return (
                                                                    <label
                                                                        key={exerciseKey}
                                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                                                            isSelected
                                                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => toggleExercise(exerciseKey)}
                                                                            className="w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                        <span className="font-medium">{exercise.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                Object.entries(filteredExerciseData).map(([groupKey, group]) => (
                                                    <MuscleGroupFolder
                                                        key={groupKey}
                                                        groupKey={groupKey}
                                                        group={group}
                                                        isExpanded={expandedGroups[groupKey]}
                                                        onToggle={toggleGroup}
                                                        selectedExercises={selectedExercises}
                                                        onToggleExercise={toggleExercise}
                                                    />
                                                ))
                                            )}
                                    </div>
                                </div>

                                <div
                                    className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3"
                                    //style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setShowExerciseList(false)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                                    >
                                        <X size={18} />
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmExercises}
                                        disabled={selectedExercises.length === 0}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95 ${
                                            selectedExercises.length > 0
                                                ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'
                                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Check size={16} />
                                        <span className="text-sm">Add ({selectedExercises.length})</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
