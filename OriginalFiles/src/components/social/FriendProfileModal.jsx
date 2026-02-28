import React, { useEffect } from 'react';
import { X, User } from 'lucide-react';
import { formatDistance, formatVolume } from '../../utils/formatters';

const formatJoinedDate = (joinedAt) => {
    if (!joinedAt) return '—';
    const date = new Date(joinedAt);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
};

export const FriendProfileModal = ({
    isOpen,
    onClose,
    profile,
    isLoading,
    onRemove,
    notifyOnWorkout,
    onToggleNotify
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = overflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            <div
                className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full"
                onPointerDown={(event) => event.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-3 rounded-full">
                                <User size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Friend profile</p>
                                <h3 className="text-2xl font-bold text-white">
                                    {profile?.username || 'Loading...'}
                                </h3>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {isLoading ? (
                        <p className="text-gray-300">Loading profile details…</p>
                    ) : profile ? (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">Joined</span>
                                <span className="text-white font-semibold">{formatJoinedDate(profile.joinedAt)}</span>
                            </div>
                            <label className="flex items-center gap-3 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={notifyOnWorkout}
                                    onChange={(event) => onToggleNotify(event.target.checked)}
                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600"
                                />
                                <span>Notify me when they post a workout</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                                    <p className="text-xs text-gray-400">Total workouts</p>
                                    <p className="text-lg font-semibold text-white">{profile.totalWorkouts}</p>
                                </div>
                                <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                                    <p className="text-xs text-gray-400">Total volume</p>
                                    <p className="text-lg font-semibold text-white">
                                        {formatVolume(profile.totalVolume)} lbs
                                    </p>
                                </div>
                                <div className="bg-gray-900/40 border border-gray-700 rounded-xl p-3">
                                    <p className="text-xs text-gray-400">Total distance</p>
                                    <p className="text-lg font-semibold text-white">
                                        {formatDistance(profile.totalDistance)} mi
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onRemove}
                                className="w-full mt-4 px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/40 font-semibold transition"
                            >
                                Remove friend
                            </button>
                        </div>
                    ) : (
                        <p className="text-gray-300">Unable to load this profile right now.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
