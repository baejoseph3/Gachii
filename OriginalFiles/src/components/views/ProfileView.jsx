import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Ellipsis, Mail, Trophy, User, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getAchievements } from '../../services/api';

const ACHIEVEMENT_FILTERS = {
    achieved: 'achieved',
    pending: 'pending',
};

const filterLabel = {
    [ACHIEVEMENT_FILTERS.achieved]: 'Achieved',
    [ACHIEVEMENT_FILTERS.pending]: 'Not Yet Achieved',
};

const AchievementFilters = ({ activeFilter, onChange }) => (
    <div className="flex flex-wrap gap-2">
        {Object.values(ACHIEVEMENT_FILTERS).map((filter) => {
            const isActive = activeFilter === filter;
            return (
                <button
                    key={filter}
                    type="button"
                    onClick={() => onChange(filter)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-gray-600 bg-gray-800 text-gray-300'
                    }`}
                >
                    {filterLabel[filter]}
                </button>
            );
        })}
    </div>
);

const AchievementListSkeleton = () => (
    <div className="space-y-3" aria-hidden="true">
        {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-700" />
                <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-gray-700" />
            </div>
        ))}
    </div>
);

const AchievementList = ({ items }) => {
    if (!items.length) {
        return (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-sm text-gray-400">
                No achievements found for this filter.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((achievement) => {
                const progressPercent = Math.max(0, Math.min(100, Math.round((achievement.progressCurrent / achievement.progressTarget) * 100)));

                return (
                    <div key={achievement.id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{achievement.title}</p>
                            <span className="text-xs font-semibold text-gray-300">
                                {achievement.progressCurrent}/{achievement.progressTarget}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-400">{achievement.description}</p>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                            <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const SettingsDrawer = ({
    isOpen,
    currentUser,
    pushEnabled,
    pushSupported,
    isEnablingPush,
    pushStatus,
    onClose,
    onSharePreferenceChange,
    onEnablePush,
    onDisablePush,
    onLogout,
}) => (
    <>
        {isOpen ? <button type="button" aria-label="Close settings" className="fixed inset-0 bg-black/40 z-20" onClick={onClose} /> : null}
        <aside
            className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-900 border-l border-gray-700 z-30 transform transition-transform duration-300 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <div className="pt-safe-top px-4 py-4 flex items-center justify-between border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">Settings</h3>
                <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-lg border border-gray-600 text-gray-200 flex items-center justify-center"
                    onClick={onClose}
                >
                    <X size={18} />
                </button>
            </div>

            <div className="p-4 space-y-5">
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-white font-semibold">Share workouts to feed</p>
                            <p className="text-gray-400 mt-2">Control whether completed workouts post to your feed.</p>
                        </div>
                        <input
                            type="checkbox"
                            className="h-6 w-6 accent-blue-500"
                            checked={currentUser.share_workouts !== false}
                            onChange={(event) => onSharePreferenceChange?.(event.target.checked)}
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-white font-semibold">Push notifications</p>
                            <p className="text-gray-400 mt-2">Get notifications when friends share workouts.</p>
                            {pushStatus ? <p className="text-xs text-gray-300 mt-2">{pushStatus}</p> : null}
                        </div>
                        {pushEnabled ? (
                            <button
                                type="button"
                                onClick={onDisablePush}
                                className="min-h-11 rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm font-semibold text-red-200"
                            >
                                Disable
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onEnablePush}
                                disabled={isEnablingPush || pushSupported === false}
                                className="min-h-11 rounded-lg border border-blue-500/40 bg-blue-900/20 px-3 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50"
                            >
                                {isEnablingPush ? 'Enabling...' : 'Enable'}
                            </button>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full min-h-11 rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm font-semibold text-red-200"
                >
                    Sign out
                </button>
            </div>
        </aside>
    </>
);

export const ProfileView = ({
    currentUser,
    onLogout,
    onSharePreferenceChange,
    onEnablePushNotifications,
    onDisablePushNotifications,
    onGetPushStatus,
}) => {
    const isMobile = useIsMobile();
    const [pushStatus, setPushStatus] = useState('');
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushSupported, setPushSupported] = useState(null);
    const [isEnablingPush, setIsEnablingPush] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [activeFilter, setActiveFilter] = useState(ACHIEVEMENT_FILTERS.achieved);
    const [achievements, setAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!onGetPushStatus) return;
        onGetPushStatus().then((result) => {
            if (result?.ok) {
                setPushEnabled(Boolean(result.enabled));
                setPushStatus(result.message || '');
                setPushSupported(typeof result.supported === 'boolean' ? result.supported : null);
            }
        });
    }, [onGetPushStatus]);

    const handleEnablePush = async () => {
        if (!onEnablePushNotifications) return;
        setIsEnablingPush(true);
        const result = await onEnablePushNotifications();
        setPushStatus(result?.message || 'Push notification prompt triggered.');
        if (typeof result?.enabled === 'boolean') {
            setPushEnabled(result.enabled);
        }
        setIsEnablingPush(false);
    };

    const handleDisablePush = async () => {
        if (!onDisablePushNotifications) return;
        const result = await onDisablePushNotifications();
        setPushStatus(result?.message || 'Push notifications disabled.');
        if (result?.ok) {
            setPushEnabled(false);
        }
    };

    const loadAchievements = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getAchievements();
            setAchievements(response.achievements || []);
        } catch (err) {
            setError(err.message || 'Failed to load achievements.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAchievements();
    }, []);

    const filteredAchievements = useMemo(
        () =>
            achievements.filter((achievement) =>
                activeFilter === ACHIEVEMENT_FILTERS.achieved ? achievement.achieved : !achievement.achieved,
            ),
        [activeFilter, achievements],
    );

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const profileContent = (
        <>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-full">
                        <User size={32} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{currentUser.username}</h2>
                        <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                            <Mail size={14} />
                            {currentUser.email}
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar size={14} />
                        <span>Joined {formatDate(currentUser.created_at)}</span>
                    </div>
                </div>
            </div>

            <hr className="border-gray-700 mb-4" />

            <section className="space-y-4 pb-8">
                <div className="flex items-center gap-2">
                    <Trophy size={20} className="text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Achievements</h2>
                </div>

                <AchievementFilters activeFilter={activeFilter} onChange={setActiveFilter} />

                {error ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-200">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={loadAchievements}
                            className="mt-3 min-h-11 rounded-lg border border-red-400/50 px-3 py-2 font-semibold"
                        >
                            Try again
                        </button>
                    </div>
                ) : null}

                {isLoading ? <AchievementListSkeleton /> : <AchievementList items={filteredAchievements} />}
            </section>

            <SettingsDrawer
                isOpen={isSettingsOpen}
                currentUser={currentUser}
                pushEnabled={pushEnabled}
                pushSupported={pushSupported}
                isEnablingPush={isEnablingPush}
                pushStatus={pushStatus}
                onClose={() => setIsSettingsOpen(false)}
                onSharePreferenceChange={onSharePreferenceChange}
                onEnablePush={handleEnablePush}
                onDisablePush={handleDisablePush}
                onLogout={onLogout}
            />
        </>
    );

    if (isMobile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top pb-32">
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top z-10 border-b border-gray-700">
                    <div className="px-4 pt-3 pb-3 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><User size={32} className="text-blue-400" />Profile</h1>
                            <p className="text-gray-400 mt-2">Manage your account and achievements</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSettingsOpen(true)}
                            className="min-h-11 min-w-11 rounded-lg border border-gray-600 text-gray-200 flex items-center justify-center"
                        >
                            <Ellipsis size={18} />
                        </button>
                    </div>
                </div>

                <div className="px-4 pt-[112px]">
                    {profileContent}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3"><User size={32} className="text-blue-400" />Profile</h1>
                        <p className="text-gray-400 mt-2">Manage your account and achievements</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(true)}
                        className="min-h-11 min-w-11 rounded-lg border border-gray-600 text-gray-200 flex items-center justify-center"
                    >
                        <Ellipsis size={18} />
                    </button>
                </div>

                {profileContent}
            </div>
        </div>
    );
};
