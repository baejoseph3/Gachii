import React from 'react';
import { Dumbbell, Pencil, Target, BicepsFlexed } from 'lucide-react';
import { WorkoutHistory } from '../workout/WorkoutHistory';

/**
 * Desktop dashboard view with quick stats, actions, and workout history.
 */
export const DashboardViewDesktop = ({ currentUser, workoutHistory, onStartWorkout, onContinueWorkout, hasActiveWorkout = false, onUpdateWorkout, onDeleteWorkout, onRepeatWorkout, customExercises, onManageExercises, onCreateExercise, pendingCreatedExercise, onPendingCreatedExerciseHandled, todayScheduledWorkout = null, onStartScheduledWorkout }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="w-full max-w-4xl mx-auto">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
                    <h1 className="text-3xl font-bold text-white">Workout Tracker</h1>
                    <p className="text-gray-400 mt-1">Welcome back, {currentUser.username}!</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
                    <div className="mt-4 mb-8 space-y-4">
                        <button
                            onClick={hasActiveWorkout ? onContinueWorkout : onStartWorkout}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 text-xl"
                        >
                            <Dumbbell size={28} />
                            {hasActiveWorkout ? 'Continue Workout' : 'Log a Workout'}
                        </button>

                        {todayScheduledWorkout && !hasActiveWorkout && (
                            <button
                                type="button"
                                onClick={() => onStartScheduledWorkout?.(todayScheduledWorkout)}
                                className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold py-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 text-xl"
                            >
                                <Dumbbell size={24} />
                                Scheduled Workout
                            </button>
                        )}

                        <div className="border-t border-gray-700 pt-4" />

                        <button
                            type="button"
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-800 hover:from-indigo-500 hover:to-blue-700 text-white font-bold py-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 text-xl"
                        >
                            <BicepsFlexed size={24} />
                            Custom Routines
                        </button>

                        <button
                            type="button"
                            onClick={() => onManageExercises?.()}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-800 hover:from-indigo-500 hover:to-blue-700 text-white font-bold py-6 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 text-xl"
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
                            onCreateExercise={onCreateExercise}
                            pendingCreatedExercise={pendingCreatedExercise}
                            onPendingCreatedExerciseHandled={onPendingCreatedExerciseHandled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
