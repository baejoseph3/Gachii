import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AuthView } from './components/views/AuthView';
import { DashboardView } from './components/views/DashboardView';
import { DashboardViewDesktop } from './components/views/DashboardViewDesktop';
import { WorkoutView } from './components/views/WorkoutView';
import { SocialView } from './components/views/SocialView';
import { SocialViewDesktop } from './components/views/SocialViewDesktop';
import { CalendarView } from './components/views/CalendarView';
import { ProgressView } from './components/views/ProgressView';
import { ProfileView } from './components/views/ProfileView';
import { AdminView } from './components/views/AdminView';
import { BottomNavigation } from './components/ui/BottomNavigation';
import { Modal } from './components/ui/Modal';
import { CreateExerciseModal } from './components/workout/CreateExerciseModal';
import { EditExercisesModal } from './components/workout/EditExercisesModal';
import { login, register, clearToken, getCurrentUser, updateUserSettings, saveWorkout, getWorkouts, updateWorkout, deleteWorkout, getCustomExercises, saveCustomExercise, updateCustomExercise, deleteCustomExercise, registerPushToken, unregisterPushToken, getCustomRoutines, saveCustomRoutine, updateCustomRoutine, deleteCustomRoutine, getScheduledWorkouts, deleteScheduledWorkout } from './services/api';
import { getFirebaseConfig, getMessagingIfSupported, getServiceWorkerRegistration } from './services/pushNotifications';
import { useIsMobile } from './hooks/useIsMobile';
import { getPrimaryMuscleGroupNames, getSecondaryMuscleGroupNames, getMuscleGroupsLabel, hasCardioMuscleGroup } from './utils/customExercises';

/**
 * Root application component that orchestrates auth, navigation, and workout flow.
 */
export default function App() {
    const ACTIVE_WORKOUT_STORAGE_KEY = 'spotter-active-workout';
    const isMobile = useIsMobile();
    const [currentView, setCurrentView] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [activeTab, setActiveTab] = useState('workout'); // For mobile bottom navigation
    const [currentTab, setCurrentTab] = useState('workouts'); // For desktop navigation

    const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});

    const [isWorkoutActive, setIsWorkoutActive] = useState(false);
    const [currentWorkout, setCurrentWorkout] = useState(null);
    const [workoutHistory, setWorkoutHistory] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [showExerciseList, setShowExerciseList] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [swapExerciseIndex, setSwapExerciseIndex] = useState(null);
    const [workoutTimer, setWorkoutTimer] = useState(0);
    const [workoutStartTime, setWorkoutStartTime] = useState(null);
    const [isWorkoutPaused, setIsWorkoutPaused] = useState(false);
    const [isViewingActiveWorkout, setIsViewingActiveWorkout] = useState(false);
    const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
    const [hasCheckedPersistedWorkout, setHasCheckedPersistedWorkout] = useState(false);

    const [customExercises, setCustomExercises] = useState([]);
    const [libraryExercises, setLibraryExercises] = useState([]);
    const [customRoutines, setCustomRoutines] = useState([]);
    const [scheduledWorkouts, setScheduledWorkouts] = useState([]);
    const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
    const [createExerciseContext, setCreateExerciseContext] = useState('library');
    const [pendingWorkoutHistoryExercise, setPendingWorkoutHistoryExercise] = useState(null);
    const [showEditExercisesModal, setShowEditExercisesModal] = useState(false);
    const [isEditingWorkout, setIsEditingWorkout] = useState(false);
    const [isCalendarFullScreenFlow, setIsCalendarFullScreenFlow] = useState(false);
    const [isRoutineFullScreenFlow, setIsRoutineFullScreenFlow] = useState(false);
    const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        buttons: []
    });

    const currentWorkoutRef = useRef(currentWorkout);
    const isPersistingWorkoutRef = useRef(false);

    const clearPersistedActiveWorkout = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
    }, [ACTIVE_WORKOUT_STORAGE_KEY]);

    const generateClientRequestId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    useEffect(() => {
        currentWorkoutRef.current = currentWorkout;
    }, [currentWorkout]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isAuthenticated || !currentUser) {
            return;
        }

        if (!isWorkoutActive || !currentWorkout) {
            return;
        }

        const activeWorkoutSnapshot = {
            version: 1,
            userId: currentUser.id,
            isWorkoutActive,
            currentWorkout,
            workoutStartTime,
            isWorkoutPaused,
            elapsedBeforePause,
            savedAt: Date.now()
        };

        window.localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(activeWorkoutSnapshot));
    }, [
        ACTIVE_WORKOUT_STORAGE_KEY,
        currentUser,
        currentWorkout,
        elapsedBeforePause,
        isAuthenticated,
        isWorkoutActive,
        isWorkoutPaused,
        workoutStartTime
    ]);

    useEffect(() => {
        if (!isAuthenticated || !currentUser) {
            setHasCheckedPersistedWorkout(false);
            return;
        }

        if (typeof window === 'undefined' || isLoadingAuth || isWorkoutActive) {
            return;
        }

        const persistedWorkoutValue = window.localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
        if (!persistedWorkoutValue) {
            setHasCheckedPersistedWorkout(true);
            return;
        }

        try {
            const persistedWorkout = JSON.parse(persistedWorkoutValue);
            if (!persistedWorkout?.isWorkoutActive || !persistedWorkout?.currentWorkout) {
                clearPersistedActiveWorkout();
                setHasCheckedPersistedWorkout(true);
                return;
            }

            if (String(persistedWorkout.userId) !== String(currentUser.id)) {
                setHasCheckedPersistedWorkout(true);
                return;
            }

            const restoredElapsedBeforePause = Number(persistedWorkout.elapsedBeforePause) || 0;
            const restoredStartTime = persistedWorkout.workoutStartTime ? Number(persistedWorkout.workoutStartTime) : null;
            const restoredIsPaused = Boolean(persistedWorkout.isWorkoutPaused);
            const restoredTimer = restoredIsPaused || !restoredStartTime
                ? restoredElapsedBeforePause
                : restoredElapsedBeforePause + Math.floor((Date.now() - restoredStartTime) / 1000);

            setCurrentWorkout(persistedWorkout.currentWorkout);
            setIsWorkoutActive(true);
            setWorkoutStartTime(restoredStartTime);
            setIsWorkoutPaused(restoredIsPaused);
            setElapsedBeforePause(restoredElapsedBeforePause);
            setWorkoutTimer(Math.max(0, restoredTimer));
            setIsViewingActiveWorkout(true);
            setActiveTab('workout');
            setCurrentTab('workouts');
            setHasCheckedPersistedWorkout(true);
        } catch (error) {
            console.error('Failed to restore active workout from local storage:', error);
            clearPersistedActiveWorkout();
            setHasCheckedPersistedWorkout(true);
        }
    }, [
        ACTIVE_WORKOUT_STORAGE_KEY,
        clearPersistedActiveWorkout,
        currentUser,
        isAuthenticated,
        isLoadingAuth,
        isWorkoutActive
    ]);


    const loadWorkoutsData = useCallback(async () => {
        if (!isAuthenticated || !currentUser) {
            return;
        }

        try {
            const data = await getWorkouts();
            setWorkoutHistory(data.workouts || []);
        } catch (error) {
            console.error('Failed to load workouts:', error);
        }
    }, [isAuthenticated, currentUser]);

    const loadCustomExercisesData = useCallback(async () => {
        if (!isAuthenticated || !currentUser) {
            setCustomExercises([]);
            setLibraryExercises([]);
            return;
        }

        try {
            const data = await getCustomExercises();
            setCustomExercises(data.exercises || []);
            setLibraryExercises(data.libraryExercises || []);
        } catch (error) {
            console.error('Failed to load custom exercises:', error);
            setCustomExercises([]);
            setLibraryExercises([]);
        }
    }, [isAuthenticated, currentUser]);

    const loadCustomRoutinesData = useCallback(async () => {
        if (!isAuthenticated || !currentUser) {
            setCustomRoutines([]);
            return;
        }

        try {
            const data = await getCustomRoutines();
            setCustomRoutines(data.routines || []);
        } catch (error) {
            console.error('Failed to load custom routines:', error);
            setCustomRoutines([]);
        }
    }, [isAuthenticated, currentUser]);

    const loadScheduledWorkoutsData = useCallback(async () => {
        if (!isAuthenticated || !currentUser) {
            setScheduledWorkouts([]);
            return;
        }

        try {
            const data = await getScheduledWorkouts();
            setScheduledWorkouts(data.scheduledWorkouts || []);
        } catch (error) {
            console.error('Failed to load scheduled workouts:', error);
            setScheduledWorkouts([]);
        }
    }, [isAuthenticated, currentUser]);

    const refreshDashboardData = useCallback(async () => {
        await Promise.all([
            loadWorkoutsData(),
            loadCustomExercisesData(),
            loadCustomRoutinesData(),
            loadScheduledWorkoutsData()
        ]);
    }, [loadWorkoutsData, loadCustomExercisesData, loadCustomRoutinesData, loadScheduledWorkoutsData]);

    // Timer effect for active workouts.
    useEffect(() => {
        let interval;
        if (isWorkoutActive && workoutStartTime && !isWorkoutPaused) {
            const tick = () => {
                const elapsedSeconds = elapsedBeforePause + Math.floor((Date.now() - workoutStartTime) / 1000);
                setWorkoutTimer(Math.max(0, elapsedSeconds));
            };
            tick();
            interval = setInterval(tick, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isWorkoutActive, workoutStartTime, isWorkoutPaused, elapsedBeforePause]);

    // Restore session on page load.
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const data = await getCurrentUser();
                setIsAuthenticated(true);
                setCurrentUser(data.user);
            } catch {
                clearToken();
                setIsAuthenticated(false);
                setCurrentUser(null);
            } finally {
                setIsLoadingAuth(false);
            }
        };

        void restoreSession();
    }, []);

    // Initialize Firebase service worker when a user is available.
    useEffect(() => {
        if (!currentUser || typeof window === 'undefined') return;
        const config = getFirebaseConfig();
        if (!config?.appId) return;
        void getServiceWorkerRegistration();
    }, [currentUser]);

    // Load workouts when user is authenticated.
    useEffect(() => {
        void loadWorkoutsData();
    }, [loadWorkoutsData]);

    // Load custom exercises when user is authenticated.
    useEffect(() => {
        void loadCustomExercisesData();
    }, [loadCustomExercisesData]);


    // Load custom routines when user is authenticated.
    useEffect(() => {
        void loadCustomRoutinesData();
    }, [loadCustomRoutinesData]);


    // Load scheduled workouts when user is authenticated.
    useEffect(() => {
        void loadScheduledWorkoutsData();
    }, [loadScheduledWorkoutsData]);

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Validate and submit the login form.
    const handleLogin = async () => {
        const newErrors = {};
        if (!loginForm.identifier) newErrors.identifier = 'Username or email is required';
        if (!loginForm.password) newErrors.password = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const data = await login({ identifier: loginForm.identifier, password: loginForm.password });
            setIsAuthenticated(true);
            setCurrentUser(data.user);
            setErrors({});
        } catch (error) {
            setErrors({ general: error.message });
        }
    };

    // Validate and submit the registration form.
    const handleRegister = async () => {
        const newErrors = {};
        if (!registerForm.username) newErrors.username = 'Username is required';
        else if (registerForm.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
        if (!registerForm.email) newErrors.email = 'Email is required';
        else if (!validateEmail(registerForm.email)) newErrors.email = 'Invalid email format';
        if (!registerForm.password) newErrors.password = 'Password is required';
        else if (registerForm.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (registerForm.password !== registerForm.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const data = await register({
                username: registerForm.username,
                email: registerForm.email,
                password: registerForm.password
            });
            setIsAuthenticated(true);
            setCurrentUser(data.user);
            setErrors({});
        } catch (error) {
            setErrors({ general: error.message });
        }
    };

    // Clear session state and return to the auth view.
    const handleLogout = () => {
        if (!window.confirm('Are you sure you want to log out?')) {
            return;
        }
        clearToken();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setLoginForm({ identifier: '', password: '' });
        setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
        setCurrentView('login');
        setIsWorkoutActive(false);
        setCurrentWorkout(null);
        setCustomExercises([]);
        setLibraryExercises([]);
        setCustomRoutines([]);
        setScheduledWorkouts([]);
        setWorkoutStartTime(null);
        setIsWorkoutPaused(false);
        setElapsedBeforePause(0);
        clearPersistedActiveWorkout();
        setIsViewingActiveWorkout(false);
        setActiveTab('workout');
        setHasCheckedPersistedWorkout(false);
    };

    // Update a custom exercise in local state after an API update.
    const handleUpdateCustomExercise = async (exerciseId, updates) => {
        const data = await updateCustomExercise({ id: exerciseId, ...updates });
        if (data.exercise) {
            setCustomExercises(prev => prev.map(exercise => (
                exercise.id === data.exercise.id ? data.exercise : exercise
            )));
            setLibraryExercises(prev => prev.map(exercise => (
                exercise.id === data.exercise.id ? data.exercise : exercise
            )));
        }
    };

    // Remove a custom exercise after deleting it from the API.
    const handleDeleteCustomExercise = async (exerciseId) => {
        await deleteCustomExercise(exerciseId);
        setCustomExercises(prev => prev.filter(exercise => exercise.id !== exerciseId));
        setLibraryExercises(prev => prev.filter(exercise => exercise.id !== exerciseId));
    };

    const toLocalDateKey = (dateValue) => {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const toLocalTimeValue = (dateValue) => {
        const hours = String(dateValue.getHours()).padStart(2, '0');
        const minutes = String(dateValue.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const combineLocalDateAndTime = (dateInput, timeInput) => {
        if (!dateInput || !timeInput) {
            return new Date().toISOString();
        }

        const [year, month, day] = dateInput.split('-').map(Number);
        const [hours, minutes] = timeInput.split(':').map(Number);
        const localDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
        return localDate.toISOString();
    };

    const todayScheduledWorkout = useMemo(() => {
        const todayKey = toLocalDateKey(new Date());
        return scheduledWorkouts.find((workout) => workout.date === todayKey) || null;
    }, [scheduledWorkouts]);

    // Start a new workout session.
    const startWorkout = () => {
        const startedAt = Date.now();
        setCurrentWorkout({
            id: Date.now(),
            date: new Date().toISOString(),
            exercises: [],
            shareToFeed: currentUser?.share_workouts ?? true,
            clientRequestId: generateClientRequestId(),
            startedAt
        });
        setIsWorkoutActive(true);
        setWorkoutStartTime(startedAt);
        setExpandedGroups({});
        setShowExerciseList(false);
        setSelectedExercises([]);
        setSwapExerciseIndex(null);
        setWorkoutTimer(0);
        setIsWorkoutPaused(false);
        setElapsedBeforePause(0);
        setIsViewingActiveWorkout(true);
        setCurrentTab('workouts');
        setActiveTab('workout');
    };

    const startScheduledWorkout = (scheduledWorkout) => {
        if (!scheduledWorkout) return;

        const startedAt = Date.now();
        setCurrentWorkout({
            id: Date.now(),
            date: new Date().toISOString(),
            name: scheduledWorkout.title || 'Scheduled workout',
            scheduledWorkoutId: scheduledWorkout.id,
            exercises: buildRoutineWorkoutExercises(scheduledWorkout.exercises || []),
            shareToFeed: currentUser?.share_workouts ?? true,
            clientRequestId: generateClientRequestId(),
            startedAt
        });
        setIsWorkoutActive(true);
        setWorkoutStartTime(startedAt);
        setExpandedGroups({});
        setShowExerciseList(false);
        setSelectedExercises([]);
        setSwapExerciseIndex(null);
        setWorkoutTimer(0);
        setIsWorkoutPaused(false);
        setElapsedBeforePause(0);
        setIsViewingActiveWorkout(true);
        setCurrentTab('workouts');
        setActiveTab('workout');
    };

    // Expand or collapse a muscle group in the exercise list.
    const toggleGroup = (groupKey) => {
        setExpandedGroups({ ...expandedGroups, [groupKey]: !expandedGroups[groupKey] });
    };

    // Toggle an exercise selection in the list.
    const toggleExercise = (exerciseKey) => {
        if (swapExerciseIndex !== null) {
            setSelectedExercises(prev => (prev.includes(exerciseKey) ? [] : [exerciseKey]));
            return;
        }

        setSelectedExercises(prev => {
            if (prev.includes(exerciseKey)) {
                return prev.filter(key => key !== exerciseKey);
            } else {
                return [...prev, exerciseKey];
            }
        });
    };

    const isCardioExercise = (exercise) => Boolean(exercise?.isCardio || (exercise.muscleGroup || '').toLowerCase() === 'cardio');

    const createDefaultSet = (cardio) => (
        cardio
            ? { id: Date.now() + Math.random(), duration: '', distance: '' }
            : { id: Date.now() + Math.random(), reps: '', weight: '' }
    );

    const findPreviousExercise = (exerciseId) => {
        const targetExerciseId = String(exerciseId);

        for (const workout of workoutHistory) {
            const match = workout.exercises?.find((exercise) => String(exercise.exerciseId) === targetExerciseId);
            if (match) {
                return match;
            }
        }
        return null;
    };

    const normalizeSetValue = (value) => (value ?? '');

    const buildSetsFromHistory = (previousExercise, isCardio) => {
        if (!previousExercise?.sets?.length) {
            return [createDefaultSet(isCardio)];
        }

        if (isCardio) {
            const [set] = previousExercise.sets;
            return [{
                id: Date.now() + Math.random(),
                duration: normalizeSetValue(set.duration),
                distance: normalizeSetValue(set.distance)
            }];
        }

        return previousExercise.sets.map(set => ({
            id: Date.now() + Math.random(),
            reps: '',
            weight: '',
            repsPlaceholder: normalizeSetValue(set.reps),
            weightPlaceholder: normalizeSetValue(set.weight)
        }));
    };

    const buildCustomExerciseEntry = (customExercise) => {
        const muscleGroupName = getMuscleGroupsLabel(customExercise);
        const isCardio = hasCardioMuscleGroup(customExercise);
        const previousExercise = findPreviousExercise(`custom-${customExercise.id}`);

        return {
            id: Date.now() + Math.random(),
            exerciseId: `custom-${customExercise.id}`,
            name: customExercise.name,
            muscleGroup: muscleGroupName,
            primaryMuscleGroups: getPrimaryMuscleGroupNames(customExercise),
            secondaryMuscleGroups: getSecondaryMuscleGroupNames(customExercise),
            isCardio,
            isBodyweight: Boolean(customExercise.is_bodyweight),
            unit: previousExercise?.unit || (isCardio ? 'mi' : 'lbs'),
            notes: previousExercise?.notes || '',
            sets: buildSetsFromHistory(previousExercise, isCardio)
        };
    };


    const buildRoutineWorkoutExercises = (exerciseNames = []) => {
        return exerciseNames.map((exerciseName) => {
            const matchedExercise = libraryExercises.find(
                (exercise) => exercise.name.toLowerCase() === exerciseName.toLowerCase()
            );

            if (!matchedExercise) {
                return null;
            }

            const isCardio = hasCardioMuscleGroup(matchedExercise);
            const isCustom = Boolean(matchedExercise.is_custom);
            const normalizedExerciseId = isCustom ? `custom-${matchedExercise.id}` : String(matchedExercise.id);
            const previousExercise = findPreviousExercise(normalizedExerciseId);

            return {
                id: Date.now() + Math.random(),
                exerciseId: normalizedExerciseId,
                name: matchedExercise.name,
                muscleGroup: getMuscleGroupsLabel(matchedExercise),
                primaryMuscleGroups: getPrimaryMuscleGroupNames(matchedExercise),
                secondaryMuscleGroups: getSecondaryMuscleGroupNames(matchedExercise),
                isCardio,
                isBodyweight: Boolean(matchedExercise.is_bodyweight),
                unit: previousExercise?.unit || (isCardio ? 'mi' : 'lbs'),
                notes: previousExercise?.notes || '',
                sets: buildSetsFromHistory(previousExercise, isCardio)
            };
        }).filter(Boolean);
    };


    const resolveExerciseDefinitionById = (exerciseId) => {
        if (!exerciseId) return null;

        const normalizedId = String(exerciseId);

        if (normalizedId.startsWith('custom-')) {
            const customId = normalizedId.replace('custom-', '');
            return customExercises.find((item) => String(item.id) === customId) || null;
        }

        return (
            libraryExercises.find((item) => String(item.id) === normalizedId)
            || customExercises.find((item) => String(item.id) === normalizedId)
            || null
        );
    };

    const cloneWorkoutForRepeat = (workout) => {
        const startedAt = Date.now();
        const repeatedExercises = (workout.exercises || []).map((exercise) => {
            const cardio = isCardioExercise(exercise);
            const clonedSets = (exercise.sets || []).map((set) => (
                cardio
                    ? {
                        id: Date.now() + Math.random(),
                        duration: '',
                        distance: '',
                        durationPlaceholder: normalizeSetValue(set.duration),
                        distancePlaceholder: normalizeSetValue(set.distance)
                    }
                    : {
                        id: Date.now() + Math.random(),
                        reps: '',
                        weight: '',
                        repsPlaceholder: normalizeSetValue(set.reps),
                        weightPlaceholder: normalizeSetValue(set.weight)
                    }
            ));

            const matchedExercise = resolveExerciseDefinitionById(exercise.exerciseId);

            return {
                ...exercise,
                id: Date.now() + Math.random(),
                muscleGroup: exercise.muscleGroup || (matchedExercise ? getMuscleGroupsLabel(matchedExercise) : ''),
                primaryMuscleGroups: exercise.primaryMuscleGroups?.length
                    ? exercise.primaryMuscleGroups
                    : (matchedExercise ? getPrimaryMuscleGroupNames(matchedExercise) : []),
                secondaryMuscleGroups: exercise.secondaryMuscleGroups?.length
                    ? exercise.secondaryMuscleGroups
                    : (matchedExercise ? getSecondaryMuscleGroupNames(matchedExercise) : []),
                unit: exercise.unit || (cardio ? 'mi' : 'lbs'),
                notes: exercise.notes || '',
                sets: clonedSets.length > 0 ? clonedSets : [createDefaultSet(cardio)]
            };
        });

        setCurrentWorkout({
            id: Date.now(),
            date: new Date().toISOString(),
            name: workout.name || 'Repeated workout',
            exercises: repeatedExercises,
            shareToFeed: currentUser?.share_workouts ?? true,
            clientRequestId: generateClientRequestId(),
            startedAt
        });
        setIsWorkoutActive(true);
        setWorkoutStartTime(startedAt);
        setExpandedGroups({});
        setShowExerciseList(false);
        setSelectedExercises([]);
        setSwapExerciseIndex(null);
        setWorkoutTimer(0);
        setIsWorkoutPaused(false);
        setElapsedBeforePause(0);
        setIsViewingActiveWorkout(true);
        setCurrentTab('workouts');
        setActiveTab('workout');
    };

    const startWorkoutFromRoutine = (routine) => {
        const startedAt = Date.now();
        setCurrentWorkout({
            id: Date.now(),
            date: new Date().toISOString(),
            name: routine.title,
            exercises: buildRoutineWorkoutExercises(routine.exercises || []),
            shareToFeed: currentUser?.share_workouts ?? true,
            clientRequestId: generateClientRequestId(),
            startedAt
        });
        setIsWorkoutActive(true);
        setWorkoutStartTime(startedAt);
        setExpandedGroups({});
        setShowExerciseList(false);
        setSelectedExercises([]);
        setSwapExerciseIndex(null);
        setWorkoutTimer(0);
        setIsWorkoutPaused(false);
        setElapsedBeforePause(0);
        setIsViewingActiveWorkout(true);
        setCurrentTab('workouts');
        setActiveTab('workout');
    };

    const handleSaveCustomRoutine = async (routine) => {
        const result = await saveCustomRoutine(routine);
        if (result.routine) {
            setCustomRoutines((prev) => [result.routine, ...prev]);
            return result.routine;
        }

        return null;
    };

    const handleUpdateCustomRoutine = async (routine) => {
        const result = await updateCustomRoutine(routine);
        if (result.routine) {
            setCustomRoutines((prev) => prev.map((item) => (item.id === result.routine.id ? result.routine : item)));
            return result.routine;
        }

        return null;
    };

    const handleDeleteCustomRoutine = async (routineId) => {
        await deleteCustomRoutine(routineId);
        setCustomRoutines((prev) => prev.filter((item) => item.id !== routineId));
    };

    const openCreateExerciseModal = (context = 'library') => {
        setCreateExerciseContext(context);
        setShowCreateExerciseModal(true);
    };

    const openExerciseListForAdd = () => {
        setSwapExerciseIndex(null);
        setShowExerciseList(true);
    };

    const closeExerciseList = () => {
        setShowExerciseList(false);
        setSwapExerciseIndex(null);
        setSelectedExercises([]);
    };

    // Add selected exercises to the active workout.
    const confirmExercises = () => {
        const newExercises = selectedExercises.map(exerciseKey => {
            const firstHyphen = exerciseKey.indexOf('-');
            const exerciseId = exerciseKey.substring(firstHyphen + 1);

            if (exerciseId.startsWith('custom-')) {
                const numericId = exerciseId.replace('custom-', '');
                const customExercise = customExercises.find(ex => ex.id.toString() === numericId);

                if (!customExercise) {
                    console.error('Custom exercise not found:', numericId);
                    return null;
                }

                const muscleGroupName = getMuscleGroupsLabel(customExercise);
                const isCardio = hasCardioMuscleGroup(customExercise);
                const previousExercise = findPreviousExercise(`custom-${customExercise.id}`);

                return {
                    id: Date.now() + Math.random(),
                    exerciseId: `custom-${customExercise.id}`,
                    name: customExercise.name,
                    muscleGroup: muscleGroupName,
                    primaryMuscleGroups: getPrimaryMuscleGroupNames(customExercise),
                    secondaryMuscleGroups: getSecondaryMuscleGroupNames(customExercise),
                    isCardio,
                    isBodyweight: Boolean(customExercise.is_bodyweight),
                    unit: previousExercise?.unit || (isCardio ? 'mi' : 'lbs'),
                    notes: previousExercise?.notes || '',
                    sets: buildSetsFromHistory(previousExercise, isCardio)
                };
            }

            const exercise = libraryExercises.find((item) => String(item.id) === exerciseId);
            if (!exercise) {
                console.error('Exercise not found:', exerciseId);
                return null;
            }

            const isCardio = hasCardioMuscleGroup(exercise);
            const previousExercise = findPreviousExercise(exercise.id);

            return {
                id: Date.now() + Math.random(),
                exerciseId: String(exercise.id),
                name: exercise.name,
                muscleGroup: getMuscleGroupsLabel(exercise),
                primaryMuscleGroups: getPrimaryMuscleGroupNames(exercise),
                secondaryMuscleGroups: getSecondaryMuscleGroupNames(exercise),
                isCardio,
                isBodyweight: Boolean(exercise.is_bodyweight),
                unit: previousExercise?.unit || (isCardio ? 'mi' : 'lbs'),
                notes: previousExercise?.notes || '',
                sets: buildSetsFromHistory(previousExercise, isCardio)
            };
        }).filter(ex => ex !== null);

        if (swapExerciseIndex !== null && newExercises.length > 0) {
            setCurrentWorkout((prevWorkout) => {
                if (!prevWorkout) {
                    return prevWorkout;
                }

                const updatedExercises = [...prevWorkout.exercises];
                updatedExercises.splice(swapExerciseIndex, 1, newExercises[0]);
                return {
                    ...prevWorkout,
                    exercises: updatedExercises
                };
            });
        } else {
            setCurrentWorkout({
                ...currentWorkout,
                exercises: [...currentWorkout.exercises, ...newExercises]
            });
        }

        setShowExerciseList(false);
        setSelectedExercises([]);
        setSwapExerciseIndex(null);
        setExpandedGroups({});
    };

    // Append a new set to an exercise.
    const addSet = (exerciseIndex) => {
        const updatedExercises = [...currentWorkout.exercises];
        const cardio = isCardioExercise(updatedExercises[exerciseIndex]);
        if (cardio) {
            updatedExercises[exerciseIndex].sets.push(createDefaultSet(cardio));
        } else {
            const previousSet = updatedExercises[exerciseIndex].sets.at(-1);
            updatedExercises[exerciseIndex].sets.push({
                id: Date.now() + Math.random(),
                reps: '',
                weight: previousSet?.weight ?? ''
            });
        }
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    // Toggle units for cardio or strength sets.
    const toggleUnit = (exerciseIndex) => {
        const updatedExercises = [...currentWorkout.exercises];
        const cardio = isCardioExercise(updatedExercises[exerciseIndex]);
        const currentUnit = updatedExercises[exerciseIndex].unit || (cardio ? 'mi' : 'lbs');
        if (cardio) {
            updatedExercises[exerciseIndex].unit = currentUnit === 'mi' ? 'km' : 'mi';
        } else {
            updatedExercises[exerciseIndex].unit = currentUnit === 'lbs' ? 'kg' : 'lbs';
        }
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    // Update a field within a specific set.
    const updateSet = (exerciseIndex, setIndex, field, value) => {
        const updatedExercises = [...currentWorkout.exercises];
        updatedExercises[exerciseIndex].sets[setIndex][field] = value;
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    const updateExerciseNotes = (exerciseIndex, notes) => {
        const updatedExercises = [...currentWorkout.exercises];
        updatedExercises[exerciseIndex].notes = notes;
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    // Remove a set from an exercise.
    const removeSet = (exerciseIndex, setIndex) => {
        const updatedExercises = [...currentWorkout.exercises];
        updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    // Remove an exercise from the workout.
    const removeExercise = (exerciseIndex) => {
        const updatedExercises = [...currentWorkout.exercises];
        updatedExercises.splice(exerciseIndex, 1);
        setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    };

    const swapExercise = (exerciseIndex) => {
        setSwapExerciseIndex(exerciseIndex);
        setShowExerciseList(true);
        setSelectedExercises([]);
        setExpandedGroups({});
    };

    const moveExerciseUp = (exerciseIndex) => {
        if (exerciseIndex <= 0) {
            return;
        }

        setCurrentWorkout((prevWorkout) => {
            if (!prevWorkout) return prevWorkout;
            const updatedExercises = [...prevWorkout.exercises];
            [updatedExercises[exerciseIndex - 1], updatedExercises[exerciseIndex]] = [updatedExercises[exerciseIndex], updatedExercises[exerciseIndex - 1]];
            return { ...prevWorkout, exercises: updatedExercises };
        });
    };

    const moveExerciseDown = (exerciseIndex) => {
        setCurrentWorkout((prevWorkout) => {
            if (!prevWorkout || exerciseIndex >= prevWorkout.exercises.length - 1) {
                return prevWorkout;
            }

            const updatedExercises = [...prevWorkout.exercises];
            [updatedExercises[exerciseIndex], updatedExercises[exerciseIndex + 1]] = [updatedExercises[exerciseIndex + 1], updatedExercises[exerciseIndex]];
            return { ...prevWorkout, exercises: updatedExercises };
        });
    };

    // Create a new custom exercise and auto-add it in active workout/build flows when relevant.
    const handleCreateExercise = async (exerciseData) => {
        try {
            const result = await saveCustomExercise(exerciseData);
            setShowCreateExerciseModal(false);

            if (result.exercise) {
                setCustomExercises(prevExercises => [result.exercise, ...prevExercises]);
                setLibraryExercises(prevExercises => [result.exercise, ...prevExercises]);

                if (createExerciseContext === 'active-workout' && currentWorkoutRef.current) {
                    const createdExercise = buildCustomExerciseEntry(result.exercise);
                    setCurrentWorkout((prevWorkout) => {
                        if (!prevWorkout) {
                            return prevWorkout;
                        }

                        if (swapExerciseIndex !== null) {
                            const updatedExercises = [...prevWorkout.exercises];
                            updatedExercises.splice(swapExerciseIndex, 1, createdExercise);

                            return {
                                ...prevWorkout,
                                exercises: updatedExercises
                            };
                        }

                        return {
                            ...prevWorkout,
                            exercises: [...prevWorkout.exercises, createdExercise]
                        };
                    });
                    setShowExerciseList(false);
                    setSelectedExercises([]);
                    setSwapExerciseIndex(null);
                    setExpandedGroups({});
                }

                if (createExerciseContext === 'edit-workout') {
                    setPendingWorkoutHistoryExercise(result.exercise);
                }
            }
        } catch (error) {
            console.error('Create exercise error:', error);
            alert(error.message || 'Failed to create exercise');
        } finally {
            setCreateExerciseContext('library');
        }
    };

    const persistWorkout = async (workoutName, sharePreference, workoutDateTime) => {
        if (isPersistingWorkoutRef.current) {
            return false;
        }

        isPersistingWorkoutRef.current = true;
        setIsFinishingWorkout(true);
        const activeWorkout = currentWorkoutRef.current;
        if (!activeWorkout) {
            isPersistingWorkoutRef.current = false;
            setIsFinishingWorkout(false);
            return false;
        }

        const workoutData = {
            ...activeWorkout,
            duration: workoutTimer,
            date: workoutDateTime || activeWorkout.date || new Date().toISOString(),
            name: workoutName || 'Workout',
            shareToFeed: activeWorkout?.shareToFeed ?? sharePreference
        };

        setModalConfig(prevConfig => ({ ...prevConfig, isOpen: false }));
        setIsViewingActiveWorkout(false);
        setActiveTab('workout');
        setCurrentTab('workouts');
        setCurrentWorkout(null);
        setIsWorkoutActive(false);
        setWorkoutStartTime(null);
        setWorkoutTimer(0);
        setIsWorkoutPaused(false);
        setElapsedBeforePause(0);
        clearPersistedActiveWorkout();

        try {
            const result = await saveWorkout(workoutData);
            const savedWorkout = { ...workoutData, id: result.workoutId ?? workoutData.id };
            setWorkoutHistory((prevHistory) => [savedWorkout, ...prevHistory]);

            if (activeWorkout?.scheduledWorkoutId) {
                try {
                    await deleteScheduledWorkout(activeWorkout.scheduledWorkoutId);
                    setScheduledWorkouts((prev) => prev.filter((workout) => workout.id !== activeWorkout.scheduledWorkoutId));
                } catch (error) {
                    console.error('Failed to remove completed scheduled workout:', error);
                }
            }
            return true;
        } catch (error) {
            console.error('Failed to save workout:', error);
            alert('Failed to save workout. Please try again.');
            return false;
        } finally {
            isPersistingWorkoutRef.current = false;
            setIsFinishingWorkout(false);
        }
    };

    // Prompt for an optional name and persist the workout.
    const finishWorkout = () => {
        if (currentWorkout.exercises.length === 0) {
            setModalConfig({
                isOpen: true,
                title: 'Cannot Finish Workout',
                message: 'Add at least one exercise before finishing!',
                buttons: [
                    {
                        label: 'OK',
                        onClick: () => setModalConfig({ ...modalConfig, isOpen: false }),
                        className: 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                ]
            });
            return;
        }

        const sharePreference = currentWorkout.shareToFeed ?? currentUser?.share_workouts ?? true;

        if (currentWorkout.shareToFeed === undefined) {
            setCurrentWorkout(prev => ({ ...prev, shareToFeed: sharePreference }));
        }

        const now = new Date();
        const defaultDate = toLocalDateKey(now);
        const defaultTime = toLocalTimeValue(now);

        setModalConfig({
            isOpen: true,
            title: 'Name Your Workout',
            message: 'Give your workout a name (optional)',
            inputs: [
                {
                    key: 'workoutName',
                    label: 'Workout Name',
                    type: 'text',
                    row: 1,
                    placeholder: 'e.g., Upper Body Day, Leg Day, etc.',
                    defaultValue: currentWorkout.name || ''
                },
                {
                    key: 'workoutDate',
                    label: 'Date',
                    type: 'date',
                    row: 2,
                    defaultValue: defaultDate
                },
                {
                    key: 'workoutTime',
                    label: 'Time',
                    type: 'time',
                    row: 2,
                    defaultValue: defaultTime
                }
            ],
            checkbox: {
                key: 'shareToFeed',
                label: 'Share this workout to your social feed'
            },
            buttons: [
                {
                    label: 'Skip',
                    onClick: () => {
                        const fallbackDateTime = combineLocalDateAndTime(defaultDate, defaultTime);
                        void persistWorkout('Workout', sharePreference, fallbackDateTime);
                    },
                    className: 'bg-gray-700 hover:bg-gray-600 text-white'
                },
                {
                    label: 'Save Workout',
                    requiresInput: true,
                    onClick: ({ workoutName, workoutDate, workoutTime }) => {
                        const selectedDateTime = combineLocalDateAndTime(workoutDate, workoutTime);
                        void persistWorkout(workoutName, sharePreference, selectedDateTime);
                    },
                    className: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'
                }
            ]
        });
    };

    const modalCheckbox = modalConfig.checkbox?.key === 'shareToFeed'
        ? {
            ...modalConfig.checkbox,
            checked: currentWorkout?.shareToFeed ?? currentUser?.share_workouts ?? true,
            onChange: () => setCurrentWorkout(prev => ({
                ...prev,
                shareToFeed: !(prev?.shareToFeed ?? currentUser?.share_workouts ?? true)
            }))
        }
        : modalConfig.checkbox;

    // Confirm cancelling an in-progress workout.
    const cancelWorkout = () => {
        setModalConfig({
            isOpen: true,
            title: 'Discard Workout?',
            message: 'Are you sure you want to discard this workout? All data will be lost.',
            buttons: [
                {
                    label: 'Keep Workout',
                    onClick: () => setModalConfig({ ...modalConfig, isOpen: false }),
                    className: 'bg-gray-700 hover:bg-gray-600 text-white'
                },
                {
                    label: 'Discard Workout',
                    onClick: () => {
                        clearPersistedActiveWorkout();
                        setCurrentWorkout(null);
                        setIsWorkoutActive(false);
                        setWorkoutStartTime(null);
                        setWorkoutTimer(0);
                        setIsWorkoutPaused(false);
                        setElapsedBeforePause(0);
                        setIsViewingActiveWorkout(false);
                        setActiveTab('workout');
                        setModalConfig({ ...modalConfig, isOpen: false });
                    },
                    className: 'bg-red-600 hover:bg-red-700 text-white'
                }
            ]
        });
    };

    // Sync workout updates with the server and local state.
    const handleUpdateWorkout = async (updatedWorkout) => {
        try {
            await updateWorkout(updatedWorkout);
            setWorkoutHistory(prevHistory => prevHistory.map(workout => (
                workout.id === updatedWorkout.id ? updatedWorkout : workout
            )));
        } catch (error) {
            console.error('Failed to update workout:', error);
            alert(error.message || 'Failed to update workout. Please try again.');
        }
    };

    // Delete a workout and remove it from history.
    const handleDeleteWorkout = async (workoutId) => {
        try {
            await deleteWorkout(workoutId);
            setWorkoutHistory(prevHistory => prevHistory.filter(workout => workout.id !== workoutId));
        } catch (error) {
            console.error('Failed to delete workout:', error);
            alert(error.message || 'Failed to delete workout. Please try again.');
        }
    };

    // Persist the user's sharing preference.
    const handleSharePreferenceChange = async (shareWorkouts) => {
        try {
            const data = await updateUserSettings({ shareWorkouts });
            setCurrentUser(data.user);
        } catch (error) {
            console.error('Failed to update settings:', error);
            alert(error.message || 'Failed to update settings. Please try again.');
        }
    };

    // Request permission and register a push notification token.
    const handleEnablePushNotifications = async () => {
        const config = getFirebaseConfig();
        if (!config?.appId || !config?.apiKey || !config?.messagingSenderId || !config?.projectId) {
            return { ok: false, message: 'Firebase push notifications are not configured yet.' };
        }
        if (!config?.vapidKey) {
            return { ok: false, message: 'Missing Firebase VAPID key for web push.' };
        }
        if (!('Notification' in window)) {
            return { ok: false, message: 'Notifications are not supported on this device or browser.' };
        }
        if (Notification.permission === 'denied') {
            return { ok: false, message: 'Notifications are blocked. Enable them in iOS Settings → Notifications → Workout App.' };
        }
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') {
            return { ok: false, message: 'Permission prompt closed without enabling push.', permission, enabled: false };
        }
        const messaging = await getMessagingIfSupported();
        if (!messaging) {
            return { ok: false, message: 'Push notifications are not supported on this device or browser.' };
        }
        const registration = await getServiceWorkerRegistration();
        if (!registration) {
            return { ok: false, message: 'Service worker registration failed for push notifications.' };
        }
        try {
            const { getToken } = await import('firebase/messaging');
            const token = await getToken(messaging, {
                vapidKey: config.vapidKey,
                serviceWorkerRegistration: registration
            });
            if (!token) {
                return { ok: false, message: 'Failed to generate a push token for this device.' };
            }
            const storedToken = localStorage.getItem('fcmToken');
            if (storedToken && storedToken !== token) {
                try {
                    await unregisterPushToken(storedToken);
                } catch (error) {
                    console.warn('Failed to unregister old push token:', error);
                }
            }
            await registerPushToken(token);
            localStorage.setItem('fcmToken', token);
            return {
                ok: true,
                message: 'Push notifications enabled for this device.',
                permission,
                enabled: true,
                token
            };
        } catch (error) {
            console.error('Push prompt error:', error);
            return { ok: false, message: 'Failed to enable push notifications.' };
        }
    };

    // Disable push notifications for the current device.
    const handleDisablePushNotifications = async () => {
        const config = getFirebaseConfig();
        if (!config?.vapidKey) {
            return { ok: false, message: 'Firebase push notifications are not configured yet.' };
        }
        const messaging = await getMessagingIfSupported();
        if (!messaging) {
            return { ok: false, message: 'Push notifications are not supported on this device or browser.' };
        }
        try {
            const { getToken, deleteToken } = await import('firebase/messaging');
            const registration = await getServiceWorkerRegistration();
            const token = await getToken(messaging, {
                vapidKey: config.vapidKey,
                serviceWorkerRegistration: registration || undefined
            });
            const storedToken = localStorage.getItem('fcmToken');
            const targetToken = token || storedToken;
            if (targetToken) {
                await unregisterPushToken(targetToken);
                await deleteToken(messaging);
                localStorage.removeItem('fcmToken');
            }
            return { ok: true, message: 'Push notifications disabled for this device.', enabled: false };
        } catch (error) {
            console.error('Disable push error:', error);
            return { ok: false, message: 'Failed to disable push notifications.' };
        }
    };

    // Read current push notification status for display.
    const handleGetPushStatus = async () => {
        const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
        const messaging = await getMessagingIfSupported();
        const supported = Boolean(messaging);
        if (!supported) {
            return {
                ok: true,
                supported: false,
                enabled: false,
                permission,
                token: null,
                message: 'Push notifications are not supported on this device or browser.'
            };
        }
        try {
            const config = getFirebaseConfig();
            if (!config?.vapidKey) {
                return { ok: false, message: 'Firebase push notifications are not configured yet.' };
            }
            const { getToken } = await import('firebase/messaging');
            const registration = await getServiceWorkerRegistration();
            const token = permission === 'granted'
                ? await getToken(messaging, {
                    vapidKey: config.vapidKey,
                    serviceWorkerRegistration: registration || undefined
                })
                : null;
            return {
                ok: true,
                supported: true,
                enabled: Boolean(token),
                permission,
                token,
                message: `Permission: ${permission}. Push enabled: ${token ? 'Yes' : 'No'}.`
            };
        } catch (error) {
            console.error('Push status error:', error);
            return { ok: false, message: 'Failed to read push status.' };
        }
    };

    // Keep workout tab active when a workout is running.
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [currentView, activeTab, currentTab]);

    const resumeWorkout = () => {
        if (!isWorkoutActive) {
            return;
        }

        if (isWorkoutPaused) {
            setWorkoutStartTime(Date.now());
            setIsWorkoutPaused(false);
        }

        setIsViewingActiveWorkout(true);
        setActiveTab('workout');
        setCurrentTab('workouts');
    };

    const pauseWorkout = () => {
        if (!isWorkoutActive || isWorkoutPaused || !workoutStartTime) {
            return;
        }

        const elapsedSeconds = elapsedBeforePause + Math.floor((Date.now() - workoutStartTime) / 1000);
        setElapsedBeforePause(Math.max(0, elapsedSeconds));
        setWorkoutTimer(Math.max(0, elapsedSeconds));
        setWorkoutStartTime(null);
        setIsWorkoutPaused(true);
    };

    const showWorkoutControlBar = isAuthenticated && isWorkoutActive && !isViewingActiveWorkout;

    const formatTimer = useMemo(() => {
        const hours = Math.floor(workoutTimer / 3600);
        const minutes = Math.floor((workoutTimer % 3600) / 60);
        const seconds = workoutTimer % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, [workoutTimer]);

    // Show loading screen while checking auth
    if (isLoadingAuth) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Show authenticated views with bottom navigation
    if (isAuthenticated) {
        if (!hasCheckedPersistedWorkout) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-400">Restoring workout...</p>
                    </div>
                </div>
            );
        }

        // Mobile version with bottom navigation and tabs
        if (isMobile) {
            return (
                <>
                    <Modal
                        isOpen={modalConfig.isOpen}
                        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                        title={modalConfig.title}
                        message={modalConfig.message}
                        buttons={modalConfig.buttons}
                        input={modalConfig.input}
                        inputs={modalConfig.inputs}
                        checkbox={modalCheckbox}
                        isBusy={isFinishingWorkout}
                    />

                    <CreateExerciseModal
                        isOpen={showCreateExerciseModal}
                        onClose={() => {
                            setShowCreateExerciseModal(false);
                            setCreateExerciseContext('library');
                        }}
                        onSubmit={handleCreateExercise}
                    />

                    <EditExercisesModal
                        isOpen={showEditExercisesModal}
                        exercises={customExercises}
                        onClose={() => setShowEditExercisesModal(false)}
                        onCreateExercise={() => openCreateExerciseModal('library')}
                        onUpdateExercise={handleUpdateCustomExercise}
                        onDeleteExercise={handleDeleteCustomExercise}
                    />

                    {activeTab === 'social' && <SocialView currentUser={currentUser} />}
                    {activeTab === 'calendar' && (
                        <CalendarView onFullScreenFlowChange={setIsCalendarFullScreenFlow} customRoutines={customRoutines} onSaveCustomRoutine={handleSaveCustomRoutine} exercises={libraryExercises} />
                    )}
                    {activeTab === 'workout' && (
                        isWorkoutActive && isViewingActiveWorkout ? (
                            <WorkoutView
                                workout={currentWorkout}
                                workoutTimer={workoutTimer}
                                expandedGroups={expandedGroups}
                                onToggleGroup={toggleGroup}
                                onAddSet={addSet}
                                onUpdateSet={updateSet}
                                onRemoveSet={removeSet}
                                onRemoveExercise={removeExercise}
                                onSwapExercise={swapExercise}
                                onMoveExerciseUp={moveExerciseUp}
                                onMoveExerciseDown={moveExerciseDown}
                                onToggleUnit={toggleUnit}
                                onUpdateExerciseNotes={updateExerciseNotes}
                                onFinish={finishWorkout}
                                onCancel={cancelWorkout}
                                onBack={() => setIsViewingActiveWorkout(false)}
                                showExerciseList={showExerciseList}
                                setShowExerciseList={openExerciseListForAdd}
                                onCloseExerciseList={closeExerciseList}
                                selectedExercises={selectedExercises}
                                onToggleExercise={toggleExercise}
                                onConfirmExercises={confirmExercises}
                                customExercises={libraryExercises}
                                onCreateExercise={() => openCreateExerciseModal('active-workout')}
                                isSwapMode={swapExerciseIndex !== null}
                            />
                        ) : (
                            <DashboardView
                                currentUser={currentUser}
                                workoutHistory={workoutHistory}
                                onStartWorkout={startWorkout}
                                todayScheduledWorkout={todayScheduledWorkout}
                                onStartScheduledWorkout={startScheduledWorkout}
                                onContinueWorkout={resumeWorkout}
                                hasActiveWorkout={isWorkoutActive}
                                onUpdateWorkout={handleUpdateWorkout}
                                onDeleteWorkout={handleDeleteWorkout}
                                onRepeatWorkout={cloneWorkoutForRepeat}
                                customExercises={libraryExercises}
                                onManageExercises={() => setShowEditExercisesModal(true)}
                                onEditWorkoutToggle={setIsEditingWorkout}
                                isBottomNavVisible={!showEditExercisesModal && !isEditingWorkout}
                                onCreateExercise={() => openCreateExerciseModal('edit-workout')}
                                pendingCreatedExercise={pendingWorkoutHistoryExercise}
                                onPendingCreatedExerciseHandled={() => setPendingWorkoutHistoryExercise(null)}
                                onRefresh={refreshDashboardData}
                                customRoutines={customRoutines}
                                onSaveCustomRoutine={handleSaveCustomRoutine}
                                onStartRoutine={startWorkoutFromRoutine}
                                onUpdateCustomRoutine={handleUpdateCustomRoutine}
                                onDeleteCustomRoutine={handleDeleteCustomRoutine}
                                onRoutineFlowChange={setIsRoutineFullScreenFlow}
                            />
                        )
                    )}
                    {activeTab === 'progress' && <ProgressView workoutHistory={workoutHistory} />}
                    {activeTab === 'profile' && (
                        <ProfileView
                            currentUser={currentUser}
                            workoutHistory={workoutHistory}
                            onLogout={handleLogout}
                            onSharePreferenceChange={handleSharePreferenceChange}
                            onEnablePushNotifications={handleEnablePushNotifications}
                            onDisablePushNotifications={handleDisablePushNotifications}
                            onGetPushStatus={handleGetPushStatus}
                        />
                    )}

                    {isMobile && showWorkoutControlBar && (
                        <div
                            className="fixed left-0 right-0 z-20 border-t border-gray-700 bg-gray-900/95 px-4 pt-3"
                            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 68px)', paddingBottom: '12px' }}
                        >
                            <div className="mx-auto flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-800/95 px-3 py-3">
                                <div className="text-blue-300 font-mono font-semibold">{formatTimer}</div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={resumeWorkout}
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                                    >
                                        Continue
                                    </button>
                                    <button
                                        type="button"
                                        onClick={pauseWorkout}
                                        disabled={isWorkoutPaused}
                                        className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${isWorkoutPaused ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        Pause
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showEditExercisesModal
                        && !isEditingWorkout
                        && !isCalendarFullScreenFlow
                        && !isRoutineFullScreenFlow
                        && !(activeTab === 'workout' && isWorkoutActive && isViewingActiveWorkout)
                        && (
                        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
                    )}
                </>
            );
        }

        // Desktop version with original layout
        return (
            <>
                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    buttons={modalConfig.buttons}
                    input={modalConfig.input}
                />
                <CreateExerciseModal
                    isOpen={showCreateExerciseModal}
                    onClose={() => {
                            setShowCreateExerciseModal(false);
                            setCreateExerciseContext('library');
                        }}
                    onSubmit={handleCreateExercise}
                />
                <EditExercisesModal
                    isOpen={showEditExercisesModal}
                    exercises={customExercises}
                    onClose={() => setShowEditExercisesModal(false)}
                    onCreateExercise={() => openCreateExerciseModal('library')}
                    onUpdateExercise={handleUpdateCustomExercise}
                    onDeleteExercise={handleDeleteCustomExercise}
                />
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                    <div className="bg-gray-900/90 border-b border-gray-700 sticky top-0 z-20 backdrop-blur">
                        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                            <div className="text-white font-bold text-lg">Spotter</div>
                            <div className="flex items-center gap-2">
                                {[
                                    { id: 'social', label: 'Social' },
                                    { id: 'calendar', label: 'Calendar' },
                                    { id: 'workouts', label: 'Workout' },
                                    { id: 'progress', label: 'Progress' },
                                    { id: 'profile', label: 'Profile' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setCurrentTab(tab.id)}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            currentTab === tab.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                                {currentUser?.is_admin && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentTab('admin')}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            currentTab === 'admin'
                                                ? 'bg-purple-600 text-white'
                                                : 'text-purple-200 hover:text-white hover:bg-purple-900/40'
                                        }`}
                                    >
                                        Admin
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {currentTab === 'workouts' && (
                        isWorkoutActive && isViewingActiveWorkout ? (
                            <WorkoutView
                                workout={currentWorkout}
                                workoutTimer={workoutTimer}
                                expandedGroups={expandedGroups}
                                onToggleGroup={toggleGroup}
                                onAddSet={addSet}
                                onUpdateSet={updateSet}
                                onRemoveSet={removeSet}
                                onRemoveExercise={removeExercise}
                                onSwapExercise={swapExercise}
                                onMoveExerciseUp={moveExerciseUp}
                                onMoveExerciseDown={moveExerciseDown}
                                onToggleUnit={toggleUnit}
                                onUpdateExerciseNotes={updateExerciseNotes}
                                onFinish={finishWorkout}
                                onCancel={cancelWorkout}
                                onBack={() => setIsViewingActiveWorkout(false)}
                                showExerciseList={showExerciseList}
                                setShowExerciseList={openExerciseListForAdd}
                                onCloseExerciseList={closeExerciseList}
                                selectedExercises={selectedExercises}
                                onToggleExercise={toggleExercise}
                                onConfirmExercises={confirmExercises}
                                customExercises={libraryExercises}
                                onCreateExercise={() => openCreateExerciseModal('active-workout')}
                                isSwapMode={swapExerciseIndex !== null}
                            />
                        ) : (
                            <DashboardViewDesktop
                                currentUser={currentUser}
                                workoutHistory={workoutHistory}
                                onStartWorkout={startWorkout}
                                todayScheduledWorkout={todayScheduledWorkout}
                                onStartScheduledWorkout={startScheduledWorkout}
                                onContinueWorkout={resumeWorkout}
                                hasActiveWorkout={isWorkoutActive}
                                onUpdateWorkout={handleUpdateWorkout}
                                onDeleteWorkout={handleDeleteWorkout}
                                onRepeatWorkout={cloneWorkoutForRepeat}
                                customExercises={libraryExercises}
                                onManageExercises={() => setShowEditExercisesModal(true)}
                                onCreateExercise={() => openCreateExerciseModal('edit-workout')}
                                pendingCreatedExercise={pendingWorkoutHistoryExercise}
                                onPendingCreatedExerciseHandled={() => setPendingWorkoutHistoryExercise(null)}
                            />
                        )
                    )}
                    {currentTab === 'social' && (
                        <SocialViewDesktop
                            onNavigateBack={() => setCurrentTab('workouts')}
                            currentUser={currentUser}
                        />
                    )}
                    {currentTab === 'calendar' && <CalendarView customRoutines={customRoutines} onSaveCustomRoutine={handleSaveCustomRoutine} exercises={libraryExercises} />}
                    {currentTab === 'progress' && <ProgressView workoutHistory={workoutHistory} />}
                    {currentTab === 'profile' && (
                        <ProfileView
                            currentUser={currentUser}
                            workoutHistory={workoutHistory}
                            onLogout={handleLogout}
                            onSharePreferenceChange={handleSharePreferenceChange}
                            onEnablePushNotifications={handleEnablePushNotifications}
                            onDisablePushNotifications={handleDisablePushNotifications}
                            onGetPushStatus={handleGetPushStatus}
                        />
                    )}
                    {currentTab === 'admin' && currentUser?.is_admin && (
                        <AdminView currentUser={currentUser} />
                    )}
                </div>

                {!isMobile && showWorkoutControlBar && (
                    <div className="fixed bottom-6 right-6 z-30">
                        <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900/95 px-4 py-3 shadow-2xl backdrop-blur">
                            <div className="text-blue-300 font-mono font-semibold min-w-[72px] text-right">{formatTimer}</div>
                            <button
                                type="button"
                                onClick={resumeWorkout}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                            >
                                Continue
                            </button>
                            <button
                                type="button"
                                onClick={pauseWorkout}
                                disabled={isWorkoutPaused}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${isWorkoutPaused ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                Pause
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Show auth view
    return (
        <>
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                title={modalConfig.title}
                message={modalConfig.message}
                buttons={modalConfig.buttons}
                input={modalConfig.input}
                checkbox={modalCheckbox}
                isBusy={isFinishingWorkout}
            />
            <AuthView
                currentView={currentView}
                setCurrentView={setCurrentView}
                loginForm={loginForm}
                setLoginForm={setLoginForm}
                registerForm={registerForm}
                setRegisterForm={setRegisterForm}
                errors={errors}
                setErrors={setErrors}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                onLogin={handleLogin}
                onRegister={handleRegister}
            />
        </>
    );
}
