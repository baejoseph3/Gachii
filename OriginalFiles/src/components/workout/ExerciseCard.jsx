import React, { useState } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp, Ellipsis, Plus, Trash2, X } from 'lucide-react';
import { SetRow } from './SetRow';
import { useScrollLock } from '../../hooks/useScrollLock';

const renderMuscleGroupBadges = (groups = [], variant = 'primary') => {
    if (!groups.length) return null;

    const classes = variant === 'primary'
        ? 'bg-purple-600/20 border-purple-500/40 text-purple-200'
        : 'bg-blue-600/20 border-blue-500/40 text-blue-200';

    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {groups.map((group) => (
                <span key={`${variant}-${group}`} className={`px-2 py-1 rounded-lg border text-xs ${classes}`}>
                    {group}
                </span>
            ))}
        </div>
    );
};

export const ExerciseCard = ({
    exercise,
    exerciseIndex,
    onAddSet,
    onUpdateSet,
    onRemoveSet,
    onRemoveExercise,
    onSwapExercise,
    onMoveExerciseUp,
    onMoveExerciseDown,
    onToggleUnit,
    onUpdateExerciseNotes
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const isCardio = Boolean(exercise.isCardio || (exercise.muscleGroup || '').toLowerCase() === 'cardio');

    const closeSettings = () => setIsSettingsOpen(false);

    useScrollLock(isSettingsOpen);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-xl font-semibold text-white">{exercise.name}</h3>
                    {isCardio ? (
                        <span className="inline-block mt-2 px-2 py-1 rounded-lg border text-xs bg-teal-600/20 border-teal-500/40 text-teal-200">Cardio</span>
                    ) : (
                        <>
                            {renderMuscleGroupBadges(exercise.primaryMuscleGroups, 'primary')}
                            {renderMuscleGroupBadges(exercise.secondaryMuscleGroups, 'secondary')}
                            {!exercise.primaryMuscleGroups?.length && !exercise.secondaryMuscleGroups?.length && (
                                <p className="text-gray-400 text-sm mt-1">{exercise.muscleGroup}</p>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3 -mt-1">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-gray-300 hover:text-white transition-colors min-h-11 min-w-11 flex items-center justify-center"
                        aria-label={`Open settings for ${exercise.name}`}
                    >
                        <Ellipsis size={20} />
                    </button>
                </div>
            </div>

            <button
                onClick={() => onToggleUnit(exerciseIndex)}
                className="mb-3 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-all text-sm font-medium"
            >
                {exercise.unit || (isCardio ? 'mi' : 'lbs')}
            </button>

            <div className="mb-4">
                <input
                    type="text"
                    value={exercise.notes ?? ''}
                    onChange={(event) => onUpdateExerciseNotes?.(exerciseIndex, event.target.value)}
                    placeholder="Exercise notes (machine setup, form cues, etc.)"
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
            </div>

            {isCardio ? (
                <div className="grid grid-cols-8 gap-3 mb-3">
                    <div className="col-span-4 text-gray-400 text-sm font-medium">Duration (min)</div>
                    <div className="col-span-4 text-gray-400 text-sm font-medium">Distance ({exercise.unit || 'mi'})</div>
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-3 mb-3">
                    <div className="col-span-2 text-gray-400 text-sm font-medium text-left">Set</div>
                    <div className="col-span-4 text-gray-400 text-sm font-medium">Weight ({exercise.unit || 'lbs'})</div>
                    <div className="col-span-4 text-gray-400 text-sm font-medium">Reps</div>
                    <div className="col-span-2"></div>
                </div>
            )}

            {exercise.sets.map((set, setIndex) => (
                <SetRow
                    key={set.id}
                    setNumber={setIndex + 1}
                    set={set}
                    isCardio={isCardio}
                    isBodyweight={Boolean(exercise.isBodyweight)}
                    onUpdate={(field, value) => onUpdateSet(exerciseIndex, setIndex, field, value)}
                    onRemove={() => onRemoveSet(exerciseIndex, setIndex)}
                />
            ))}

            {!isCardio && (
                <button
                    onClick={() => onAddSet(exerciseIndex)}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    Add Set
                </button>
            )}

            {isSettingsOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/60" onClick={closeSettings} />
                    <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-900 border-t border-gray-700 rounded-t-2xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-semibold">Exercise Settings</h4>
                            <button
                                type="button"
                                onClick={closeSettings}
                                className="text-gray-400 hover:text-white min-h-11 min-w-11 flex items-center justify-center"
                                aria-label="Close settings"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onSwapExercise?.(exerciseIndex);
                                    closeSettings();
                                }}
                                className="w-full min-h-11 text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl transition-colors flex items-center gap-2"
                            >
                                <ArrowRightLeft size={16} />
                                <span>Swap exercise</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onMoveExerciseUp?.(exerciseIndex);
                                    closeSettings();
                                }}
                                className="w-full min-h-11 text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl transition-colors flex items-center gap-2"
                            >
                                <ChevronUp size={16} />
                                <span>Move exercise up</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onMoveExerciseDown?.(exerciseIndex);
                                    closeSettings();
                                }}
                                className="w-full min-h-11 text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl transition-colors flex items-center gap-2"
                            >
                                <ChevronDown size={16} />
                                <span>Move exercise down</span>
                            </button>

                            <hr className="border-gray-700/80 my-3" />

                            <button
                                type="button"
                                onClick={() => {
                                    onRemoveExercise(exerciseIndex);
                                    closeSettings();
                                }}
                                className="w-full min-h-11 text-left px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                <span>Discard exercise</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
