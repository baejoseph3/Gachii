import React, { useState } from 'react';
import { Clock, Ruler, Weight, User, MessageSquare, Trash2 } from 'lucide-react';
import { formatDistance, formatVolume } from '../../utils/formatters';

const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const isCardioExercise = (exercise) => (exercise.muscleGroup || '').toLowerCase() === 'cardio';

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

export const FeedWorkoutCard = ({ workout, onAddComment, onDeleteComment, currentUserId }) => {
    const totals = calculateTotals(workout.exercises);
    const [commentText, setCommentText] = useState('');
    const comments = workout.comments || [];
    const durationSeconds = Number.isFinite(workout.duration) ? workout.duration : 0;

    const handleSubmit = async () => {
        if (!commentText.trim() || !onAddComment) return;
        const comment = commentText.trim();
        setCommentText('');
        await onAddComment(workout.id, comment);
    };

    return (
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-600">
                <div className="bg-blue-600 p-2 rounded-full">
                    <User size={16} className="text-white" />
                </div>
                <div>
                    <div className="text-white font-semibold">{workout.username}</div>
                    <div className="text-gray-400 text-xs">
                        {new Date(workout.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
            </div>

            {/* Workout Info */}
            <div className="mb-4">
                <div className="text-white font-bold text-lg mb-1">{workout.name}</div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-blue-400">
                        <Clock size={14} />
                        <span>{formatDuration(durationSeconds)}</span>
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

            {/* Exercises */}
            <div className="flex flex-wrap gap-2">
                {workout.exercises.map((ex, idx) => (
                    <span key={idx} className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                        {ex.name} ({ex.sets.length} sets)
                    </span>
                ))}
            </div>

            {/* Comments */}
            <div className="mt-4 border-t border-gray-600 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                    <MessageSquare size={14} />
                    <span>Comments</span>
                    <span className="text-gray-500">({comments.length})</span>
                </div>

                {comments.length === 0 ? (
                    <div className="text-xs text-gray-500 mb-4">Be the first to comment.</div>
                ) : (
                    <div className="space-y-2 mb-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-gray-800/60 border border-gray-600/60 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-200">{comment.username}</span>
                                        <span>
                                            {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    {comment.userId === currentUserId && (
                                        <button
                                            type="button"
                                            onClick={() => onDeleteComment?.(comment.id)}
                                            className="text-red-300 hover:text-red-200 transition-colors flex items-center gap-1"
                                            aria-label="Delete comment"
                                        >
                                            <Trash2 size={12} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wide">Delete</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-200">{comment.comment}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Write a comment..."
                        rows={2}
                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    />
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!commentText.trim() || !onAddComment}
                        className={`self-end px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            commentText.trim() && onAddComment
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Post Comment
                    </button>
                </div>
            </div>
        </div>
    );
};
