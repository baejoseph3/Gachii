import React, { useMemo } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const ProgressButtons = () => (
    <div className="grid grid-cols-2 gap-3">
        <button
            type="button"
            className="min-h-12 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
            Exercise Progress
        </button>
        <button
            type="button"
            className="min-h-12 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
            Exercise History
        </button>
    </div>
);

const MetricCard = ({ label, value }) => (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
);

const getStartOfWeek = () => {
    const now = new Date();
    const date = new Date(now);
    const day = date.getDay();
    const diffToMonday = (day + 6) % 7;
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - diffToMonday);
    return date;
};

const getWorkoutVolume = (workout) => {
    if (!Array.isArray(workout.exercises)) return 0;

    return workout.exercises.reduce((total, exercise) => {
        if (!Array.isArray(exercise.sets)) return total;

        const exerciseVolume = exercise.sets.reduce((exerciseTotal, set) => {
            const weight = Number(set.weight) || 0;
            const reps = Number(set.reps) || 0;
            return exerciseTotal + (weight * reps);
        }, 0);

        return total + exerciseVolume;
    }, 0);
};

export const ProgressView = ({ workoutHistory = [] }) => {
    const isMobile = useIsMobile();

    const metrics = useMemo(() => {
        const startOfWeek = getStartOfWeek();

        const workoutsThisWeek = workoutHistory.filter((workout) => {
            const workoutDate = new Date(workout.date);
            return workoutDate >= startOfWeek;
        });

        const totalVolume = workoutHistory.reduce((sum, workout) => sum + getWorkoutVolume(workout), 0);
        const weeklyVolume = workoutsThisWeek.reduce((sum, workout) => sum + getWorkoutVolume(workout), 0);

        return {
            totalWorkouts: workoutHistory.length,
            weeklyWorkouts: workoutsThisWeek.length,
            totalVolume,
            weeklyVolume,
        };
    }, [workoutHistory]);

    const wrapperClasses = isMobile
        ? 'min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top pb-32'
        : 'min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4';

    const contentClasses = isMobile ? 'px-4 pt-[112px]' : 'max-w-4xl mx-auto';

    return (
        <div className={wrapperClasses}>
            <div
                className={isMobile
                    ? 'fixed top-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top z-10 border-b border-gray-700'
                    : ''
                }
            >
                <div className={isMobile ? 'px-4 pt-3 pb-3' : 'bg-gray-800 border border-gray-700 rounded-2xl p-4 mb-6'}>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <TrendingUp className="text-blue-500" size={32} />
                        Progress
                    </h1>
                    <p className="text-gray-400 mt-2">Track your fitness journey</p>
                </div>
            </div>

            <div className={contentClasses}>
                <div className="space-y-6">
                    <ProgressButtons />

                    <hr className="border-gray-700" />
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Activity size={20} className="text-blue-400" />
                            <h2 className="text-xl font-bold text-white">Workout Metrics</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <MetricCard label="Total workouts logged" value={metrics.totalWorkouts} />
                            <MetricCard label="Total workouts this week" value={metrics.weeklyWorkouts} />
                            <MetricCard label="Total volume logged" value={Math.round(metrics.totalVolume).toLocaleString()} />
                            <MetricCard label="Total volume this week" value={Math.round(metrics.weeklyVolume).toLocaleString()} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
