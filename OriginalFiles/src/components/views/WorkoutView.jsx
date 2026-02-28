import React, { useMemo, useState } from 'react';
import { ArrowLeft, Dumbbell, Plus, Check, PlusCircle, Trash2, CheckCircle2, X } from 'lucide-react';
import { MuscleGroupFolder } from '../workout/MuscleGroupFolder';
import { ExerciseCard } from '../workout/ExerciseCard';
import { EXERCISE_DATA } from '../../data/exerciseData';
import { buildMergedExerciseData } from '../../utils/customExercises';

const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const WorkoutView = ({
                                workout,
                                workoutTimer,
                                expandedGroups,
                                onToggleGroup,
                                onAddSet,
                                onUpdateSet,
                                onRemoveSet,
                                onRemoveExercise,
                                onSwapExercise,
                                onMoveExerciseUp,
                                onMoveExerciseDown,
                                onToggleUnit,
                                onUpdateExerciseNotes,
                                onFinish,
                                onCancel,
                                onBack,
                                showExerciseList,
                                setShowExerciseList,
                                onCloseExerciseList,
                                selectedExercises,
                                onToggleExercise,
                                onConfirmExercises,
                                onCreateExercise,
                                customExercises = [],
                                isSwapMode = false
                            }) => {
    const [exerciseSearch, setExerciseSearch] = useState('');
    const mergedExerciseData = useMemo(
        () => buildMergedExerciseData(EXERCISE_DATA, customExercises),
        [customExercises]
    );

    const filteredExerciseData = useMemo(() => {
        const term = exerciseSearch.trim().toLowerCase();
        if (!term) {
            return mergedExerciseData;
        }

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

    if (showExerciseList) {
        return (
            <div className="min-h-screen bg-gray-900 pb-32">
                <div className="pt-safe-top pt-4 fixed top-0 left-0 right-0 z-20 bg-gray-900 border-b border-gray-800">
                    <div
                        className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gray-900"
                        aria-hidden="true"
                    ></div>
                    <div className="relative flex justify-between items-center px-4 pb-2">
                        <h2 className="text-lg font-semibold text-white">{isSwapMode ? 'Swap Exercise' : 'Add Exercise'}</h2>
                        <button
                            onClick={onCreateExercise}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all active:scale-95"
                        >
                            <PlusCircle size={16} />
                            <span className="text-sm">Create</span>
                        </button>
                    </div>

                    <div className="px-4 pb-3">
                        <label className="sr-only" htmlFor="exercise-search">Search exercises</label>
                        <div className="relative">
                            <input
                                id="exercise-search"
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
                                                            onChange={() => onToggleExercise(exerciseKey, groupKey, exercise)}
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
                                        onToggle={onToggleGroup}
                                        selectedExercises={selectedExercises}
                                        onToggleExercise={onToggleExercise}
                                    />
                                ))
                            )}
                    </div>
                </div>

                <div
                    className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <button
                        type="button"
                        onClick={onCloseExerciseList}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmExercises}
                        disabled={selectedExercises.length === 0}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95 ${
                            selectedExercises.length > 0
                                ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <Check size={16} />
                        <span className="text-sm">{isSwapMode ? 'Swap' : `Add (${selectedExercises.length})`}</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-40">
            <div className="px-4 pt-[calc(env(safe-area-inset-top)+84px)]">
                {/* Header */}
                <div className="pt-safe-top pt-3 pb-3 fixed top-0 left-0 right-0 z-20 border-b border-gray-800/90">
                    <div
                        className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm"
                        aria-hidden="true"
                    ></div>
                    <div className="relative flex justify-between items-center mb-2 px-4">
                        <div className="flex items-start gap-3">
                            <button
                                onClick={onBack}
                                className="mt-0.5 flex items-center justify-center w-9 h-9 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all active:scale-95"
                                aria-label="Back to app"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Dumbbell className="text-blue-500" size={20} />
                                    Active Workout
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-blue-400 font-mono font-semibold">
                                            {formatTime(workoutTimer)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-3">
                    {workout.exercises.length === 0 ? (
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
                            <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No exercises added yet.</p>
                            <p className="text-gray-500 text-sm mt-2">Click "Add Exercise" to get started!</p>
                        </div>
                    ) : (
                        workout.exercises.map((exercise, idx) => (
                            <ExerciseCard
                                key={exercise.id}
                                exercise={exercise}
                                exerciseIndex={idx}
                                onAddSet={onAddSet}
                                onUpdateSet={onUpdateSet}
                                onRemoveSet={onRemoveSet}
                                onRemoveExercise={onRemoveExercise}
                                onSwapExercise={onSwapExercise}
                                onMoveExerciseUp={onMoveExerciseUp}
                                onMoveExerciseDown={onMoveExerciseDown}
                                onToggleUnit={onToggleUnit}
                                onUpdateExerciseNotes={onUpdateExerciseNotes}
                            />
                        ))
                    )}
                </div>

                {!showExerciseList && (
                    <div className="mt-8">
                        <button
                            onClick={setShowExerciseList}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            Add Exercise
                        </button>
                    </div>
                )}

                <div
                    className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                    >
                        <Trash2 size={18} />
                        Discard
                    </button>
                    <button
                        type="button"
                        onClick={onFinish}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 rounded-xl transition-all active:scale-95"
                    >
                        <CheckCircle2 size={18} />
                        Finish
                    </button>
                </div>
            </div>
        </div>
    );
};
