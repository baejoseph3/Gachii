import React, { useMemo, useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Trash2,
    Dumbbell,
    Plus,
    PlusCircle,
    Save,
    Check,
    X
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
    createScheduledWorkout,
    deleteScheduledWorkout,
    getFriends,
    getScheduledWorkouts,
    getWorkouts,
    saveCustomExercise
} from '../../services/api';
import { EXERCISE_DATA } from '../../data/exerciseData';
import { buildMergedExerciseData, getPrimaryMuscleGroupNames } from '../../utils/customExercises';
import { MuscleGroupFolder } from '../workout/MuscleGroupFolder';
import { CreateExerciseModal } from '../workout/CreateExerciseModal';


const normalizeName = (value) => value.trim().toLowerCase();
const EXERCISE_CHIP_CLASS = 'px-3 py-1 rounded-lg text-xs border bg-blue-600/20 border-blue-500/40 text-blue-200';
const MUSCLE_GROUP_CHIP_CLASS = 'px-3 py-1 rounded-lg text-xs border bg-purple-600/20 border-purple-500/40 text-purple-200';

export const CalendarView = ({ onFullScreenFlowChange = () => {}, customRoutines = [], onSaveCustomRoutine, exercises = [] }) => {
    const isMobile = useIsMobile();
    const [activeScreen, setActiveScreen] = useState('calendar');
    const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [scheduledWorkouts, setScheduledWorkouts] = useState([]);
    const [loggedWorkouts, setLoggedWorkouts] = useState([]);
    const [formValues, setFormValues] = useState({
        title: '',
        date: toLocalDateKey(new Date()),
        time: '12:00',
        durationHours: 1,
        durationMinutes: 0,
    });
    const [plannedExercises, setPlannedExercises] = useState([]);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [selectedExerciseDetails, setSelectedExerciseDetails] = useState({});
    const [expandedGroups, setExpandedGroups] = useState({});
    const [friendSearch, setFriendSearch] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [friends, setFriends] = useState([]);
    const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
    const [routineTitle, setRoutineTitle] = useState('');
    const [routineExercises, setRoutineExercises] = useState([]);

    const filteredFriends = useMemo(
        () => friends.filter(friend => friend.username?.toLowerCase().includes(friendSearch.toLowerCase())),
        [friendSearch, friends]
    );
    const friendOptions = useMemo(
        () => filteredFriends.slice(0, 5),
        [filteredFriends]
    );
    const selectedDateKey = toLocalDateKey(selectedDate);
    const selectedDayWorkouts = useMemo(() => {
        const combined = [...scheduledWorkouts, ...loggedWorkouts];
        return combined.filter(workout => workout.date === selectedDateKey);
    }, [scheduledWorkouts, loggedWorkouts, selectedDateKey]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
    const loggedDates = useMemo(
        () => new Set(loggedWorkouts.map(workout => workout.date)),
        [loggedWorkouts]
    );
    const sortedDayWorkouts = useMemo(
        () => [...selectedDayWorkouts].sort((a, b) => (a.time || '').localeCompare(b.time || '')),
        [selectedDayWorkouts]
    );
    const mergedExerciseData = useMemo(() => mergeCustomExercises(EXERCISE_DATA, exercises), [exercises]);
    const exercisesByName = useMemo(() => {
        const map = new Map();
        exercises.forEach((exercise) => {
            map.set(normalizeName(exercise.name), exercise);
        });
        return map;
    }, [exercises]);
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

    const handleWeekChange = (direction) => {
        setWeekStart(prev => addDays(prev, direction * 7));
    };

    const handleDaySelect = (day) => {
        setSelectedDate(day);
        setFormValues(prev => ({ ...prev, date: toLocalDateKey(day) }));
    };

    const toggleFriend = (friend) => {
        setSelectedFriends(prev => (
            prev.some(selected => getFriendKey(selected) === getFriendKey(friend))
                ? prev.filter(selected => getFriendKey(selected) !== getFriendKey(friend))
                : [...prev, friend]
        ));
    };

    const handleDeleteScheduledWorkout = async (workoutId) => {
        setScheduledWorkouts(prev => prev.filter(workout => workout.id !== workoutId));
        try {
            await deleteScheduledWorkout(workoutId);
        } catch (error) {
            console.error('Failed to delete scheduled workout:', error);
        }
    };

    const resetScheduleForm = () => {
        setFormValues({
            title: '',
            date: formValues.date,
            time: '07:00',
            durationHours: 0,
            durationMinutes: 45,
        });
        setSelectedFriends([]);
        setFriendSearch('');
        setPlannedExercises([]);
        setExerciseSearch('');
        setSelectedExercises([]);
        setSelectedExerciseDetails({});
        setExpandedGroups({});
    };

    const saveScheduledWorkout = async () => {
        const newWorkout = {
            title: formValues.title?.trim() || 'Scheduled workout',
            date: formValues.date,
            time: formValues.time,
            duration: toDurationMinutes(formValues.durationHours, formValues.durationMinutes),
            friends: selectedFriends.map(friend => friend.username),
            exercises: plannedExercises
        };
        try {
            const data = await createScheduledWorkout(newWorkout);
            setScheduledWorkouts(prev => [...prev, {
                ...data.scheduledWorkout,
                type: 'scheduled',
                title: data.scheduledWorkout.title || newWorkout.title,
                exercises: data.scheduledWorkout.exercises || newWorkout.exercises || []
            }]);
            setActiveScreen('calendar');
            setSelectedDate(parseLocalDateInput(formValues.date));
            resetScheduleForm();
        } catch (error) {
            console.error('Failed to save scheduled workout:', error);
        }
    };

    const handleScheduleSubmit = async (event) => {
        event.preventDefault();
        await saveScheduledWorkout();
    };

    const handleToggleExercise = (exerciseKey, groupKey, exercise) => {
        setSelectedExercises(prev => (
            prev.includes(exerciseKey)
                ? prev.filter(item => item !== exerciseKey)
                : [...prev, exerciseKey]
        ));
        setSelectedExerciseDetails(prev => {
            if (prev[exerciseKey]) {
                const { [exerciseKey]: removed, ...rest } = prev;
                return rest;
            }
            return {
                ...prev,
                [exerciseKey]: exercise.name
            };
        });
    };

    const handleConfirmExercises = () => {
        const names = selectedExercises
            .map(key => selectedExerciseDetails[key])
            .filter(Boolean);
        if (names.length === 0) {
            setActiveScreen('build');
            return;
        }
        setPlannedExercises(prev => {
            const existing = new Set(prev);
            names.forEach(name => existing.add(name));
            return Array.from(existing);
        });
        setSelectedExercises([]);
        setSelectedExerciseDetails({});
        setExerciseSearch('');
        setActiveScreen('build');
    };

    const handlePlannedExerciseRemove = (exerciseIndex) => {
        setPlannedExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
    };

    const handleRoutineExerciseRemove = (exerciseIndex) => {
        setRoutineExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
    };

    const openCreateRoutineFlow = () => {
        setRoutineTitle(formValues.title || '');
        setRoutineExercises(Array.from(new Set(plannedExercises)));
        setSelectedExercises([]);
        setSelectedExerciseDetails({});
        setExerciseSearch('');
        setExpandedGroups({});
        setActiveScreen('createRoutine');
    };

    const handleConfirmRoutineExercises = () => {
        const names = selectedExercises
            .map(key => selectedExerciseDetails[key])
            .filter(Boolean);
        if (names.length > 0) {
            setRoutineExercises(prev => {
                const existing = new Set(prev);
                names.forEach((name) => existing.add(name));
                return Array.from(existing);
            });
        }
        setSelectedExercises([]);
        setSelectedExerciseDetails({});
        setExerciseSearch('');
        setActiveScreen('createRoutine');
    };

    const handleSaveRoutineFromCalendar = async () => {
        if (!routineTitle.trim() || routineExercises.length === 0 || !onSaveCustomRoutine) {
            return;
        }

        const savedRoutine = await onSaveCustomRoutine({
            title: routineTitle.trim(),
            exercises: routineExercises
        });

        const routineToUse = savedRoutine || {
            title: routineTitle.trim(),
            exercises: routineExercises
        };

        const nextExercises = Array.from(new Set([...(plannedExercises || []), ...(routineToUse.exercises || [])]));
        setPlannedExercises(nextExercises);
        setFormValues((prev) => ({
            ...prev,
            title: prev.title || routineToUse.title
        }));

        setRoutineTitle('');
        setRoutineExercises([]);
        setActiveScreen('schedule');
    };

    const handleToggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    const handleCreateExercise = async (exerciseData) => {
        const result = await saveCustomExercise(exerciseData);
        if (result.exercise) {
            setPlannedExercises((prev) => {
                if (prev.includes(result.exercise.name)) {
                    return prev;
                }
                return [...prev, result.exercise.name];
            });
        }
        setShowCreateExerciseModal(false);
        setActiveScreen('build');
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [friendsResult, scheduleResult, workoutsResult] = await Promise.allSettled([
                    getFriends(),
                    getScheduledWorkouts(),
                    getWorkouts()
                ]);

                if (friendsResult.status === 'fulfilled') {
                    setFriends(friendsResult.value.friends || []);
                }

                if (scheduleResult.status === 'fulfilled') {
                    setScheduledWorkouts((scheduleResult.value.scheduledWorkouts || []).map(workout => ({
                        ...workout,
                        type: 'scheduled',
                        title: workout.title || 'Scheduled workout',
                        exercises: workout.exercises || []
                    })));
                } else {
                    console.error('Failed to load scheduled workouts:', scheduleResult.reason);
                    setScheduledWorkouts([]);
                }

                if (workoutsResult.status === 'fulfilled') {
                    setLoggedWorkouts(normalizeLoggedWorkouts(workoutsResult.value.workouts || []));
                } else {
                    console.error('Failed to load logged workouts:', workoutsResult.reason);
                    setLoggedWorkouts([]);
                }

            } catch (error) {
                console.error('Failed to load calendar data:', error);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [activeScreen]);

    const isFullScreenFlow = activeScreen === 'schedule' || activeScreen === 'build' || activeScreen === 'exerciseList' || activeScreen === 'chooseWorkout' || activeScreen === 'createRoutine' || activeScreen === 'routineExerciseList';
    const showCalendarHeader = !isFullScreenFlow;
    const contentPadding = isMobile && showCalendarHeader ? '130px' : '0px';
    const mobileFlowContentPadding = 'calc(env(safe-area-inset-top) + 104px)';
    const scheduleContentPadding = 'calc(env(safe-area-inset-top) + 80px)';
    const chooseWorkoutContentPadding = 'calc(env(safe-area-inset-top) + 80px)';
    const buildWorkoutContentPadding = 'calc(env(safe-area-inset-top) + 80px)';

    useEffect(() => {
        onFullScreenFlowChange(isFullScreenFlow);

        return () => {
            onFullScreenFlowChange(false);
        };
    }, [isFullScreenFlow, onFullScreenFlowChange]);

    return (
        <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${isMobile ? `${isFullScreenFlow ? '' : 'pt-safe-top'} ${isFullScreenFlow ? 'pb-0' : 'pb-32'}` : 'p-4'}`}>
            {showCalendarHeader && isMobile ? (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top z-10 border-b border-gray-700">
                    <div className="px-4 pt-4 pb-4">
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <CalendarIcon className="text-blue-500" size={32} />
                            Calendar
                        </h1>
                        <p className="text-gray-400 mt-2">Track your workout schedule</p>
                    </div>
                </div>
            ) : showCalendarHeader ? (
                <div className="max-w-5xl mx-auto">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <CalendarIcon className="text-blue-500" size={32} />
                            Calendar
                        </h1>
                        <p className="text-gray-400 mt-2">Track your workout schedule</p>
                    </div>
                </div>
            ) : null}

            <div className={`${isFullScreenFlow ? '' : (isMobile ? 'px-4' : 'max-w-5xl mx-auto')} space-y-6`} style={{ paddingTop: contentPadding }}>
                {activeScreen === 'calendar' ? (
                    <>
                        <section className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-6">
                            <div>
                                <div className="flex items-center justify-between text-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => handleWeekChange(-1)}
                                        className="p-2 rounded-full hover:bg-gray-700 transition"
                                        aria-label="Previous week"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="text-lg font-semibold text-white">
                                        {formatWeekRange(weekStart)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleWeekChange(1)}
                                        className="p-2 rounded-full hover:bg-gray-700 transition"
                                        aria-label="Next week"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>

                                <div className="mt-5 grid grid-cols-7 gap-2 text-center">
                                    {weekDays.map(day => {
                                        const dayKey = toLocalDateKey(day);
                                        const hasLoggedWorkout = loggedDates.has(dayKey);
                                        const isSelected = isSameDay(day, selectedDate);
                                        return (
                                            <button
                                                key={day.toISOString()}
                                                type="button"
                                                onClick={() => handleDaySelect(day)}
                                                className={`rounded-xl border px-1 py-3 transition ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-500/20 text-white'
                                                        : hasLoggedWorkout
                                                            ? 'border-purple-400/60 bg-purple-500/10 text-purple-100 hover:border-purple-300'
                                                            : 'border-gray-700 bg-gray-900/60 text-gray-200 hover:border-gray-500'
                                                }`}
                                            >
                                                <div className="text-xs uppercase tracking-wide text-gray-400">
                                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </div>
                                                <div className="text-lg font-semibold">{day.getDate()}</div>
                                                <div className="mt-1 text-xs text-gray-400">
                                                    {formatDayIndicators([...scheduledWorkouts, ...loggedWorkouts], day)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">{formatLongDate(selectedDate)}</h2>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    {sortedDayWorkouts.length > 0 ? (
                                        sortedDayWorkouts.map(workout => (
                                            <div key={workout.id} className="bg-gray-900/70 border border-gray-700 rounded-xl px-4 py-3">
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="font-semibold text-white truncate">
                                                            {workout.title || 'Workout'}
                                                        </div>
                                                        {workout.type === 'scheduled' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteScheduledWorkout(workout.id)}
                                                                className="p-2 rounded-full border border-gray-700 text-gray-400 hover:text-red-300 hover:border-red-400 transition"
                                                                aria-label="Delete scheduled workout"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">Logged</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-300">{formatTimeLabel(workout.time)}</div>
                                                    <div className="text-sm text-blue-200">
                                                        {formatDurationLabel(workout.duration)}
                                                    </div>
                                                    {workout.friends && (
                                                        <div className="text-xs text-gray-400">
                                                            {workout.friends.length > 0 ? `With ${workout.friends.join(', ')}` : 'Solo session'}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        {workout.exercises && workout.exercises.length > 0 ? (
                                                            workout.exercises.map((exercise, index) => (
                                                                <span key={`${workout.id}-exercise-${index}`} className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs">
                                                                    {exercise}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-500">Exercises not set</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500">No workouts scheduled for this day yet.</div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <button
                            type="button"
                            onClick={() => setActiveScreen('schedule')}
                            className="w-full rounded-2xl bg-blue-500 text-white py-3 font-semibold shadow-lg hover:bg-blue-400 transition"
                        >
                            Schedule Workout
                        </button>
                    </>
                ) : activeScreen === 'schedule' ? (
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                        <div className="pt-safe-top pt-4 pb-6 fixed top-0 left-0 right-0 z-20 border-b border-gray-800">
                            <div
                                className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm"
                                aria-hidden="true"
                            ></div>
                            <div className="relative px-4">
                                <h2 className="text-2xl font-bold text-white">Schedule a Workout</h2>
                            </div>
                        </div>

                        <form className="px-4 pb-40 space-y-4" style={{ paddingTop: scheduleContentPadding }} onSubmit={handleScheduleSubmit}>
                            <section className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveScreen('build')}
                                        className="flex-1 rounded-2xl py-3 font-semibold transition bg-purple-600 text-white hover:bg-purple-500"
                                    >
                                        Build Workout
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveScreen('chooseWorkout')}
                                        className="flex-1 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 font-semibold transition"
                                    >
                                        Choose Workout
                                    </button>
                                </div>
                            </section>

                            <section className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-5">
                                <div className="grid gap-4 sm:grid-cols-4">
                                <label className="text-sm text-gray-300 flex flex-col gap-2">
                                    Title
                                    <input
                                        type="text"
                                        value={formValues.title}
                                        onChange={(event) => setFormValues(prev => ({ ...prev, title: event.target.value }))}
                                        placeholder="Workout"
                                        className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                                    />
                                </label>
                                <label className="text-sm text-gray-300 flex flex-col gap-2">
                                    Date
                                    <input
                                        type="date"
                                        value={formValues.date}
                                        onChange={(event) => setFormValues(prev => ({ ...prev, date: event.target.value }))}
                                        className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                                    />
                                </label>
                                <label className="text-sm text-gray-300 flex flex-col gap-2">
                                    Time
                                    <input
                                        type="time"
                                        value={formValues.time}
                                        onChange={(event) => setFormValues(prev => ({ ...prev, time: event.target.value }))}
                                        className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                                    />
                                </label>
                                <div className="text-sm text-gray-300 flex flex-col gap-2">
                                    Duration
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="12"
                                            value={formValues.durationHours}
                                            onChange={(event) => setFormValues(prev => ({ ...prev, durationHours: event.target.value }))}
                                            className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                                            placeholder="h"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={formValues.durationMinutes}
                                            onChange={(event) => setFormValues(prev => ({ ...prev, durationMinutes: event.target.value }))}
                                            className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                                            placeholder="m"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">Hours / Minutes</span>
                                </div>
                                </div>

                                <div className="space-y-4">
                                <label className="text-sm text-gray-300 flex flex-col gap-2">
                                    Search friends
                                    <input
                                        type="search"
                                        placeholder="Type a name..."
                                        value={friendSearch}
                                        onChange={(event) => setFriendSearch(event.target.value)}
                                        className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                                    />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {friendOptions.map(friend => (
                                        <button
                                            key={getFriendKey(friend)}
                                            type="button"
                                            onClick={() => toggleFriend(friend)}
                                            className={`px-3 py-2 rounded-full text-sm border transition ${
                                                selectedFriends.some(selected => getFriendKey(selected) === getFriendKey(friend))
                                                    ? 'bg-blue-500/20 border-blue-400 text-blue-100'
                                                    : 'bg-gray-900 border-gray-700 text-gray-200 hover:border-gray-500'
                                            }`}
                                        >
                                            {friend.username}
                                        </button>
                                    ))}
                                    {friendOptions.length === 0 && (
                                        <p className="text-sm text-gray-500">
                                            {friends.length === 0 ? 'No friends yet.' : 'No matches found.'}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3 space-y-2">
                                    <div className="text-xs uppercase tracking-wide text-gray-400">Planned Exercises</div>
                                    {plannedExercises.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {plannedExercises.map((exercise, index) => (
                                                <span
                                                    key={`planned-exercise-${exercise}-${index}`}
                                                    className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs"
                                                >
                                                    {exercise}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No exercises added yet. Tap Build Workout to add them.</p>
                                    )}
                                </div>
                                </div>
                            </section>

                            <div
                                className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setActiveScreen('calendar')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                                >
                                    <ArrowLeft size={18} />
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 rounded-xl transition-all active:scale-95"
                                >
                                    <Plus size={18} />
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>

                ) : activeScreen === 'chooseWorkout' ? (
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                        <div className="pt-safe-top pt-4 pb-6 fixed top-0 left-0 right-0 z-20 border-b border-gray-800">
                            <div className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm" aria-hidden="true"></div>
                            <div className="relative px-4">
                                <h2 className="text-2xl font-bold text-white">Choose Workout</h2>
                            </div>
                        </div>

                        <div className="px-4 pb-32 space-y-4" style={{ paddingTop: chooseWorkoutContentPadding }}>
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
                                    <h3 className="text-lg font-semibold text-white">{routine.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(routine.exercises || []).map((exercise) => (
                                            <span key={`${routine.id}-exercise-${exercise}`} className={EXERCISE_CHIP_CLASS}>
                                                {exercise}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {primaryGroups.map((group) => (
                                            <span key={`${routine.id}-group-${group}`} className={MUSCLE_GROUP_CHIP_CLASS}>
                                                {group}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const names = Array.from(new Set([...(plannedExercises || []), ...(routine.exercises || [])]));
                                            setPlannedExercises(names);
                                            setFormValues((prev) => ({
                                                ...prev,
                                                title: prev.title || routine.title
                                            }));
                                            setActiveScreen('schedule');
                                        }}
                                        className="w-full rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 font-semibold transition"
                                    >
                                        Select
                                    </button>
                                </div>
                                );
                            })}
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                            <button
                                type="button"
                                onClick={() => setActiveScreen('schedule')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft size={18} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={openCreateRoutineFlow}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                Create
                            </button>
                        </div>
                    </div>
                ) : activeScreen === 'createRoutine' ? (
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                        <div className="pt-safe-top pt-4 pb-6 fixed top-0 left-0 right-0 z-20 border-b border-gray-800">
                            <div className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm" aria-hidden="true"></div>
                            <div className="relative px-4">
                                <h2 className="text-2xl font-bold text-white">Create Routine</h2>
                            </div>
                        </div>

                        <div className="px-4 pb-32 space-y-4" style={{ paddingTop: mobileFlowContentPadding }}>
                            <label className="text-sm text-gray-300 flex flex-col gap-2">
                                Routine title
                                <input
                                    type="text"
                                    value={routineTitle}
                                    onChange={(event) => setRoutineTitle(event.target.value)}
                                    placeholder="Push Day"
                                    className="rounded-xl bg-gray-900 border border-gray-700 px-3 py-3 text-white"
                                />
                            </label>

                            {routineExercises.length === 0 ? (
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
                                    <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No exercises added yet.</p>
                                    <p className="text-gray-500 text-sm mt-2">Click "Add Exercise" to get started!</p>
                                </div>
                            ) : (
                                routineExercises.map((exercise, index) => (
                                    <div key={`${exercise}-${index}`} className="flex items-center justify-between bg-gray-900/70 border border-gray-700 rounded-xl px-4 py-3">
                                        <div className="text-white font-semibold">{exercise}</div>
                                        <button
                                            type="button"
                                            onClick={() => handleRoutineExerciseRemove(index)}
                                            className="p-2 rounded-full border border-gray-700 text-gray-400 hover:text-red-300 hover:border-red-400 transition"
                                            aria-label={`Remove ${exercise}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}

                            <button
                                type="button"
                                onClick={() => setActiveScreen('routineExerciseList')}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                Add Exercise
                            </button>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                            <button
                                type="button"
                                onClick={() => setActiveScreen('chooseWorkout')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft size={18} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRoutineFromCalendar}
                                disabled={!routineTitle.trim() || routineExercises.length === 0}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95 ${!routineTitle.trim() || routineExercises.length === 0 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'}`}
                            >
                                <Save size={18} />
                                Save
                            </button>
                        </div>
                    </div>
                ) : activeScreen === 'routineExerciseList' ? (
                    <div className="min-h-screen bg-gray-900 pb-32">
                        <div className="pt-safe-top pt-4 fixed top-0 left-0 right-0 z-20 bg-gray-900 border-b border-gray-800">
                            <div className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gray-900" aria-hidden="true"></div>
                            <div className="relative flex justify-between items-center px-4 pb-2">
                                <h2 className="text-lg font-semibold text-white">Add Exercise</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateExerciseModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all active:scale-95"
                                >
                                    <PlusCircle size={16} />
                                    <span className="text-sm">Create</span>
                                </button>
                            </div>

                            <div className="px-4 pb-3">
                                <label className="sr-only" htmlFor="routine-exercise-search">Search exercises</label>
                                <div className="relative">
                                    <input
                                        id="routine-exercise-search"
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

                        <div className="px-4 h-full overflow-y-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 136px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)' }}>
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
                                                                className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${isSelected ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-gray-700 bg-gray-800 text-gray-100 hover:border-gray-600'}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => handleToggleExercise(exerciseKey, groupKey, exercise)}
                                                                    className="h-4 w-4 rounded border-gray-500 bg-gray-900 text-blue-500 focus:ring-blue-500"
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
                                                onToggle={handleToggleGroup}
                                                selectedExercises={selectedExercises}
                                                onToggleExercise={handleToggleExercise}
                                            />
                                        ))
                                    )}
                            </div>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                            <button
                                type="button"
                                onClick={() => setActiveScreen('createRoutine')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft size={18} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRoutineExercises}
                                disabled={selectedExercises.length === 0}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95 ${selectedExercises.length > 0 ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                            >
                                <Check size={16} />
                                <span className="text-sm">Add ({selectedExercises.length})</span>
                            </button>
                        </div>
                    </div>
                ) : activeScreen === 'build' ? (
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                        <div className="pt-safe-top pt-4 pb-6 fixed top-0 left-0 right-0 z-20 border-b border-gray-800">
                            <div
                                className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm"
                                aria-hidden="true"
                            ></div>
                            <div className="relative flex justify-between items-center px-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Dumbbell className="text-blue-500" size={24} />
                                        Build Workout
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 pb-32 space-y-4" style={{ paddingTop: buildWorkoutContentPadding }}>
                            {plannedExercises.length === 0 ? (
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
                                    <Dumbbell size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No exercises added yet.</p>
                                    <p className="text-gray-500 text-sm mt-2">Tap "Add Exercise" to get started.</p>
                                </div>
                            ) : (
                                plannedExercises.map((exercise, index) => (
                                    <div
                                        key={`${exercise}-${index}`}
                                        className="flex items-center justify-between bg-gray-900/70 border border-gray-700 rounded-xl px-4 py-3"
                                    >
                                        <div className="text-white font-semibold">{exercise}</div>
                                        <button
                                            type="button"
                                            onClick={() => handlePlannedExerciseRemove(index)}
                                            className="p-2 rounded-full border border-gray-700 text-gray-400 hover:text-red-300 hover:border-red-400 transition"
                                            aria-label={`Remove ${exercise}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}

                            <button
                                type="button"
                                onClick={() => setActiveScreen('exerciseList')}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                Add Exercise
                            </button>
                        </div>

                        <div
                            className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                        >
                            <button
                                type="button"
                                onClick={() => setActiveScreen('schedule')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft size={18} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveScreen('schedule')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <Save size={18} />
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="min-h-screen bg-gray-900 pb-32">
                        <div className="pt-safe-top pt-4 fixed top-0 left-0 right-0 z-20 bg-gray-900 border-b border-gray-800">
                            <div
                                className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gray-900"
                                aria-hidden="true"
                            ></div>
                            <div className="relative flex justify-between items-center px-4 pb-2">
                                <h2 className="text-lg font-semibold text-white">Add Exercise</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateExerciseModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all active:scale-95"
                                >
                                    <PlusCircle size={16} />
                                    <span className="text-sm">Create</span>
                                </button>
                            </div>

                            <div className="px-4 pb-3">
                                <label className="sr-only" htmlFor="planned-exercise-search">Search exercises</label>
                                <div className="relative">
                                    <input
                                        id="planned-exercise-search"
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
                                                                    onChange={() => handleToggleExercise(exerciseKey, groupKey, exercise)}
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
                                                onToggle={handleToggleGroup}
                                                selectedExercises={selectedExercises}
                                                onToggleExercise={handleToggleExercise}
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
                                onClick={() => setActiveScreen('build')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft size={18} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmExercises}
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

            <CreateExerciseModal
                isOpen={showCreateExerciseModal}
                onClose={() => setShowCreateExerciseModal(false)}
                onSubmit={handleCreateExercise}
            />
        </div>
    );
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const getStartOfWeek = (date) => {
    const start = new Date(date);
    const dayIndex = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayIndex);
    start.setHours(0, 0, 0, 0);
    return start;
};

const isSameDay = (left, right) => (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
);

const parseLocalDateInput = (dateValue) => {
    if (!dateValue) return new Date();
    const [year, month, day] = dateValue.split('-').map(Number);
    if (!year || !month || !day) return new Date(dateValue);
    return new Date(year, month - 1, day);
};

const formatWeekRange = (weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startLabel} – ${endLabel}`;
};

const formatLongDate = (date) => (
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
);

const formatTimeLabel = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    if (hours === undefined || minutes === undefined) return time;
    const display = new Date();
    display.setHours(Number(hours), Number(minutes), 0, 0);
    return display.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const normalizeLoggedWorkouts = (workouts) => workouts.map(workout => {
    const loggedAt = new Date(workout.date);
    return {
        id: `logged-${workout.id}`,
        type: 'logged',
        title: workout.name || 'Logged workout',
        date: toLocalDateKey(loggedAt),
        time: toLocalTimeLabel(loggedAt),
        duration: formatLoggedDuration(workout.duration),
        friends: null,
        exercises: (workout.exercises || []).map(exercise => exercise.name)
    };
});

const toLocalDateKey = (date) => (
    date.toLocaleDateString('en-CA')
);

const toLocalTimeLabel = (date) => (
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
);

const formatLoggedDuration = (duration) => {
    const seconds = Number(duration) || 0;
    if (seconds === 0) return 0;
    return Math.max(1, Math.round(seconds / 60));
};

const toDurationMinutes = (hoursValue, minutesValue) => {
    const hours = Number(hoursValue) || 0;
    const minutes = Number(minutesValue) || 0;
    return Math.max(0, (hours * 60) + minutes);
};

const formatDurationLabel = (minutesValue) => {
    const totalMinutes = Number(minutesValue) || 0;
    if (totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const getFriendKey = (friend) => friend?.friend_id ?? friend?.id ?? friend?.email ?? friend?.username;

const formatDayIndicators = (workouts, day) => {
    const count = workouts.filter(workout => workout.date === toLocalDateKey(day)).length;
    if (count === 0) return '–';
    if (count === 1) return '●';
    if (count === 2) return '●●';
    return '●●●';
};

const mergeCustomExercises = (exerciseData, customExercises) => buildMergedExerciseData(exerciseData, customExercises);
