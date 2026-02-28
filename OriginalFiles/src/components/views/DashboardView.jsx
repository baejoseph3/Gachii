import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Dumbbell,
    Pencil,
    Plus,
    ArrowLeft,
    Check,
    Play,
    Trash2,
    BicepsFlexed,
    Calendar as CalendarIcon,
    X
} from 'lucide-react';
import { WorkoutHistory } from '../workout/WorkoutHistory';
import { MuscleGroupFolder } from '../workout/MuscleGroupFolder';
import { EXERCISE_DATA } from '../../data/exerciseData';
import { buildMergedExerciseData, getPrimaryMuscleGroupNames } from '../../utils/customExercises';
import { PullToRefreshIndicator, PULL_TO_REFRESH_THRESHOLD } from '../ui/PullToRefreshIndicator';

const normalizeName = (value) => value.trim().toLowerCase();

const EXERCISE_CHIP_CLASS = 'px-3 py-1 rounded-lg text-xs border bg-blue-600/20 border-blue-500/40 text-blue-200';
const MUSCLE_GROUP_CHIP_CLASS = 'px-3 py-1 rounded-lg text-xs border bg-purple-600/20 border-purple-500/40 text-purple-200';

export const DashboardView = ({
    currentUser,
    workoutHistory,
    onStartWorkout,
    onContinueWorkout,
    todayScheduledWorkout = null,
    onStartScheduledWorkout,
    hasActiveWorkout = false,
    onUpdateWorkout,
    onDeleteWorkout,
    onRepeatWorkout,
    customExercises,
    onManageExercises,
    onEditWorkoutToggle,
    isBottomNavVisible = true,
    onCreateExercise,
    pendingCreatedExercise,
    onPendingCreatedExerciseHandled,
    customRoutines = [],
    onSaveCustomRoutine,
    onStartRoutine,
    onUpdateCustomRoutine,
    onDeleteCustomRoutine,
    onRoutineFlowChange = () => {},
    onRefresh = async () => {}
}) => {
    const [activeScreen, setActiveScreen] = useState('home');
    const [routineTitle, setRoutineTitle] = useState('');
    const [routineExercises, setRoutineExercises] = useState([]);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [editingRoutineId, setEditingRoutineId] = useState(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);

    const touchStartRef = useRef(0);
    const pullingRef = useRef(false);

    useEffect(() => {
        onRoutineFlowChange(activeScreen !== 'home');

        return () => {
            onRoutineFlowChange(false);
        };
    }, [activeScreen, onRoutineFlowChange]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [activeScreen]);

    const mergedExerciseData = useMemo(() => buildMergedExerciseData(EXERCISE_DATA, customExercises), [customExercises]);
    const exercisesByName = useMemo(() => {
        const map = new Map();
        customExercises.forEach((exercise) => {
            map.set(normalizeName(exercise.name), exercise);
        });
        return map;
    }, [customExercises]);

    const filteredExerciseData = useMemo(() => {
        const term = exerciseSearch.trim().toLowerCase();
        if (!term) return mergedExerciseData;
        return Object.entries(mergedExerciseData).reduce((acc, [groupKey, group]) => {
            const exercises = group.exercises.filter((exercise) => exercise.name.toLowerCase().includes(term));
            if (exercises.length > 0) {
                acc[groupKey] = { ...group, exercises };
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

    const resolvePrimaryGroups = (exerciseName) => {
        const match = exercisesByName.get(normalizeName(exerciseName));
        if (!match) {
            return [];
        }

        return getPrimaryMuscleGroupNames(match);
    };

    const getRoutinePrimaryGroups = (routine) => Array.from(new Set(
        (routine.exercises || []).flatMap((name) => resolvePrimaryGroups(name))
    ));

    const toggleExercise = (exerciseKey, exerciseName) => {
        setSelectedExercises((prev) => (
            prev.some((item) => item.key === exerciseKey)
                ? prev.filter((item) => item.key !== exerciseKey)
                : [...prev, { key: exerciseKey, name: exerciseName }]
        ));
    };

    const confirmRoutineExercises = () => {
        if (selectedExercises.length > 0) {
            setRoutineExercises((prev) => {
                const next = new Set(prev);
                selectedExercises.forEach((exercise) => next.add(exercise.name));
                return Array.from(next);
            });
        }
        setSelectedExercises([]);
        setExerciseSearch('');
        setExpandedGroups({});
        setActiveScreen(editingRoutineId ? 'editRoutine' : 'createRoutine');
    };

    const saveRoutine = async () => {
        if (!routineTitle.trim() || routineExercises.length === 0) return;

        if (editingRoutineId) {
            await onUpdateCustomRoutine?.({
                id: editingRoutineId,
                title: routineTitle.trim(),
                exercises: routineExercises
            });
        } else {
            await onSaveCustomRoutine?.({
                title: routineTitle.trim(),
                exercises: routineExercises
            });
        }

        setRoutineTitle('');
        setRoutineExercises([]);
        setEditingRoutineId(null);
        setActiveScreen('routines');
    };

    const startEditingRoutine = (routine) => {
        setEditingRoutineId(routine.id);
        setRoutineTitle(routine.title || '');
        setRoutineExercises(routine.exercises || []);
        setExerciseSearch('');
        setSelectedExercises([]);
        setExpandedGroups({});
        setActiveScreen('editRoutine');
    };


    const handleTouchStart = (event) => {
        if (activeScreen !== 'home' || window.scrollY !== 0 || isRefreshing) return;
        touchStartRef.current = event.touches[0].clientY;
        pullingRef.current = true;
    };

    const handleTouchMove = (event) => {
        if (!pullingRef.current || activeScreen !== 'home') return;
        const distance = event.touches[0].clientY - touchStartRef.current;
        if (distance > 0) {
            setPullDistance(Math.min(distance, 120));
        }
    };

    const handleTouchEnd = async () => {
        if (!pullingRef.current || activeScreen !== 'home') return;
        pullingRef.current = false;

        if (pullDistance > PULL_TO_REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
            return;
        }

        setPullDistance(0);
    };

    const deleteRoutine = async () => {
        if (!editingRoutineId || !onDeleteCustomRoutine) return;
        if (!window.confirm('Delete this routine? This cannot be undone.')) return;

        await onDeleteCustomRoutine(editingRoutineId);
        setRoutineTitle('');
        setRoutineExercises([]);
        setEditingRoutineId(null);
        setActiveScreen('routines');
    };

    if (activeScreen === 'routines') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top pb-32">
                <div className="fixed top-0 left-0 right-0 bg-gray-900/95 border-b border-gray-700 z-10 pt-safe-top">
                    <div className="px-4 pt-4 pb-4">
                        <h2 className="text-xl text-white font-bold">Custom Routines</h2>
                    </div>
                </div>

                <div className="px-4 space-y-4" style={{ paddingTop: '96px' }}>
                    {customRoutines.length === 0 ? (
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
                            <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No routines added yet.</p>
                            <p className="text-gray-500 text-sm mt-2">Click create routine to get started!</p>
                        </div>
                    ) : customRoutines.map((routine) => {
                        const primaryGroups = getRoutinePrimaryGroups(routine);
                        return (
                            <div key={routine.id} className="rounded-2xl border border-gray-700 bg-gray-800 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-lg font-semibold text-white">{routine.title}</h3>
                                    <button
                                        type="button"
                                        onClick={() => startEditingRoutine(routine)}
                                        className="flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white bg-blue-600/30 hover:bg-blue-600/50 px-3 py-1 rounded-full border border-blue-500/40 transition-colors"
                                    >
                                        <Pencil size={14} />
                                        Edit
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(routine.exercises || []).map((exercise) => (
                                        <span key={`${routine.id}-exercise-${exercise}`} className={EXERCISE_CHIP_CLASS}>
                                            {exercise}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {primaryGroups.map((group) => (
                                        <span key={`${routine.id}-${group}`} className={MUSCLE_GROUP_CHIP_CLASS}>
                                            {group}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onStartRoutine?.(routine)}
                                    className="w-full min-h-11 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold flex items-center justify-center gap-2"
                                >
                                    <Play size={16} />
                                    Start
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <button onClick={() => setActiveScreen('home')} className="flex-1 min-h-11 rounded-xl bg-gray-700 text-white font-semibold flex items-center justify-center gap-2"><ArrowLeft size={18} />Cancel</button>
                    <button onClick={() => { setEditingRoutineId(null); setRoutineTitle(''); setRoutineExercises([]); setActiveScreen('createRoutine'); }} className="flex-1 min-h-11 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold flex items-center justify-center gap-2"><Plus size={18} />Create</button>
                </div>
            </div>
        );
    }


    if (activeScreen === 'editRoutine') {
        return (
            <div className="min-h-screen bg-gray-900 pb-32">
                <div className="fixed top-0 left-0 right-0 bg-gray-900/95 border-b border-gray-700 z-10">
                    <div className="px-4 pt-safe-top pt-4 pb-4">
                        <h2 className="text-lg font-semibold text-white">Edit Routine</h2>
                    </div>
                </div>

                <div className="px-4 pb-32 space-y-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 88px)' }}>
                    <label className="text-sm text-gray-300 flex flex-col gap-2">
                        Routine title
                        <input value={routineTitle} onChange={(event) => setRoutineTitle(event.target.value)} placeholder="Upper body push" className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-white" />
                    </label>

                    <div className="border-t border-gray-700 pt-4 space-y-3">
                            {routineExercises.length === 0 ? (
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
                                    <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No exercises added yet.</p>
                                    <p className="text-gray-500 text-sm mt-2">Click "Add Exercise" to get started!</p>
                                </div>
                            ) : routineExercises.map((exercise, index) => (
                                <div key={`${exercise}-${index}`} className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 flex items-center justify-between">
                                    <span className="text-white">{exercise}</span>
                                    <button
                                        type="button"
                                        onClick={() => setRoutineExercises((prev) => prev.filter((_, idx) => idx !== index))}
                                        className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
                                        aria-label={`Remove ${exercise}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                    </div>

                    <button onClick={() => setActiveScreen('routineExerciseList')} className="w-full min-h-11 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2">
                        <Plus size={18} /> Add Exercise
                    </button>

                    <div className="pt-4 border-t border-gray-800 flex justify-center">
                        <button
                            type="button"
                            onClick={deleteRoutine}
                            className="min-h-11 flex items-center gap-2 text-sm font-semibold text-red-200 hover:text-white bg-red-600/20 hover:bg-red-600/40 px-4 py-2 rounded-full border border-red-500/40 transition-colors"
                            disabled={!onDeleteCustomRoutine}
                        >
                            <Trash2 size={16} />
                            Delete Routine
                        </button>
                    </div>
                </div>
                <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <button onClick={() => { setRoutineTitle(''); setRoutineExercises([]); setEditingRoutineId(null); setActiveScreen('routines'); }} className="flex-1 min-h-11 rounded-xl bg-gray-700 text-white font-semibold flex items-center justify-center gap-2"><ArrowLeft size={18} />Cancel</button>
                    <button onClick={saveRoutine} disabled={!routineTitle.trim() || routineExercises.length === 0} className="flex-1 min-h-11 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:bg-none disabled:bg-gray-600 text-white font-semibold flex items-center justify-center gap-2">
                        <Check size={16} /> Save
                    </button>
                </div>
            </div>
        );
    }

    if (activeScreen === 'createRoutine') {
        return (
            <div className="min-h-screen bg-gray-900 pb-32">
                <div className="fixed top-0 left-0 right-0 bg-gray-900/95 border-b border-gray-700 z-10">
                    <div className="px-4 pt-safe-top pt-4 pb-4">
                        <h2 className="text-lg font-semibold text-white">Create Routine</h2>
                    </div>
                </div>

                <div className="px-4 pb-32 space-y-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 88px)' }}>
                    <label className="text-sm text-gray-300 flex flex-col gap-2">
                        Routine title
                        <input value={routineTitle} onChange={(event) => setRoutineTitle(event.target.value)} placeholder="Upper body push" className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-white" />
                    </label>

                    <div className="border-t border-gray-700 pt-4 space-y-3">
                            {routineExercises.length === 0 ? (
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
                                    <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No exercises added yet.</p>
                                    <p className="text-gray-500 text-sm mt-2">Click "Add Exercise" to get started!</p>
                                </div>
                            ) : routineExercises.map((exercise, index) => (
                                <div key={`${exercise}-${index}`} className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 flex items-center justify-between">
                                    <span className="text-white">{exercise}</span>
                                    <button
                                        type="button"
                                        onClick={() => setRoutineExercises((prev) => prev.filter((_, idx) => idx !== index))}
                                        className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
                                        aria-label={`Remove ${exercise}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                    </div>

                    <button onClick={() => setActiveScreen('routineExerciseList')} className="w-full min-h-11 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2">
                        <Plus size={18} /> Add Exercise
                    </button>
                </div>
                <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <button onClick={() => { setRoutineTitle(''); setRoutineExercises([]); setEditingRoutineId(null); setActiveScreen('routines'); }} className="flex-1 min-h-11 rounded-xl bg-gray-700 text-white font-semibold flex items-center justify-center gap-2"><ArrowLeft size={18} />Cancel</button>
                    <button onClick={saveRoutine} disabled={!routineTitle.trim() || routineExercises.length === 0} className="flex-1 min-h-11 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:bg-none disabled:bg-gray-600 text-white font-semibold flex items-center justify-center gap-2">
                        <Check size={16} /> Save
                    </button>
                </div>
            </div>
        );
    }

    if (activeScreen === 'routineExerciseList') {
        return (
            <div className="min-h-screen bg-gray-900 pb-32">
                <div className="pt-safe-top pt-4 fixed top-0 left-0 right-0 z-20 bg-gray-900 border-b border-gray-800 px-4 pb-3 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white">Add Exercise</h2>
                        <button onClick={onCreateExercise} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg">
                            <Plus size={16} /> <span className="text-sm">Create</span>
                        </button>
                    </div>
                    <div className="relative">
                        <input type="search" value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder="Search exercises" className="w-full rounded-xl bg-gray-900 border border-gray-700 text-white px-4 pr-12 py-3" />
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

                <div className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 126px)' }}>
                    <div className="space-y-2">
                        {exerciseSearch.trim() ? (
                            <>
                                {searchResults.length === 0 ? (
                                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center text-gray-400">
                                        No exercises match your search.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {searchResults.map(({ groupKey, exercise }) => {
                                            const exerciseKey = `${groupKey}-${exercise.id}`;
                                            const isSelected = selectedExercises.some((item) => item.key === exerciseKey);

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
                                                        onChange={() => toggleExercise(exerciseKey, exercise.name)}
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
                                    onToggle={(key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
                                    selectedExercises={selectedExercises.map((exercise) => exercise.key)}
                                    onToggleExercise={(exerciseKey) => {
                                        const item = group.exercises.find((exercise) => `${groupKey}-${exercise.id}` === exerciseKey);
                                        if (!item) return;
                                        toggleExercise(exerciseKey, item.name);
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <button onClick={() => setActiveScreen(editingRoutineId ? 'editRoutine' : 'createRoutine')} className="flex-1 min-h-11 rounded-xl bg-gray-700 text-white flex items-center justify-center gap-2"><ArrowLeft size={18} />Cancel</button>
                    <button onClick={confirmRoutineExercises} className="flex-1 min-h-11 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white">Add ({selectedExercises.length})</button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top ${
                isBottomNavVisible ? 'pb-32' : 'pb-0'
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="fixed top-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top z-10 border-b border-gray-700">
                <div className="px-4 pt-4 pb-4">
                    <h1 className="text-3xl font-bold text-white">Workout Tracker</h1>
                    <p className="text-gray-400 mt-1">Welcome back, {currentUser.username}!</p>
                </div>
            </div>

            <div className="px-4" style={{ paddingTop: '100px' }}>
                <PullToRefreshIndicator
                    isRefreshing={isRefreshing}
                    pullDistance={pullDistance}
                    threshold={PULL_TO_REFRESH_THRESHOLD}
                    idleLabel="Pull to refresh"
                    loadingLabel="Refreshing dashboard…"
                />

                <div className="mt-4 mb-8 space-y-3">
                    <button onClick={hasActiveWorkout ? onContinueWorkout : onStartWorkout} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-5 rounded-2xl active:scale-95 shadow-lg flex items-center justify-center gap-3 text-lg">
                        <Dumbbell size={28} />
                        {hasActiveWorkout ? 'Continue Workout' : 'Log a Workout'}
                    </button>

                    {todayScheduledWorkout && !hasActiveWorkout && (
                        <button
                            type="button"
                            onClick={() => onStartScheduledWorkout?.(todayScheduledWorkout)}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold py-5 rounded-2xl active:scale-95 shadow-lg flex items-center justify-center gap-3 text-lg transition-colors"
                        >
                            <CalendarIcon size={24} />
                            Scheduled Workout
                        </button>
                    )}

                    <div className="border-t border-gray-700 pt-3" />

                    <button
                        type="button"
                        onClick={() => setActiveScreen('routines')}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-800 hover:from-indigo-500 hover:to-blue-700 text-white font-bold py-5 rounded-2xl active:scale-95 shadow-lg flex items-center justify-center gap-3 text-lg transition-colors"
                    >
                        <BicepsFlexed size={24} />
                        Custom Routines
                    </button>

                    <button
                        type="button"
                        onClick={() => onManageExercises?.()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-800 hover:from-indigo-500 hover:to-blue-700 text-white font-bold py-5 rounded-2xl active:scale-95 shadow-lg flex items-center justify-center gap-3 text-lg transition-colors"
                    >
                        <Pencil size={24} />
                        Manage Exercises
                    </button>
                </div>

                <div className="border-t border-gray-700 pt-6">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Workouts</h2>
                    <WorkoutHistory
                        workouts={workoutHistory}
                        onUpdateWorkout={onUpdateWorkout}
                        onDeleteWorkout={onDeleteWorkout}
                        onRepeatWorkout={onRepeatWorkout}
                        customExercises={customExercises}
                        onEditWorkoutToggle={onEditWorkoutToggle}
                        onCreateExercise={onCreateExercise}
                        pendingCreatedExercise={pendingCreatedExercise}
                        onPendingCreatedExerciseHandled={onPendingCreatedExerciseHandled}
                    />
                </div>
            </div>
        </div>
    );
};
