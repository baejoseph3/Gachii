import React, { useEffect, useMemo, useState } from 'react';
import {Dumbbell, Pencil, Plus, Trash2, Save, ArrowLeft} from 'lucide-react';
import { MUSCLE_GROUPS } from '../../data/exerciseData';
import { useScrollLock } from '../../hooks/useScrollLock';
import { getExercisePrimaryMuscleGroups, getExerciseSecondaryMuscleGroups, getPrimaryMuscleGroupKey } from '../../utils/customExercises';

const getMuscleGroupName = (key) => {
    const match = MUSCLE_GROUPS.find((group) => group.key === key);
    return match ? match.name : key;
};

const toLabels = (keys) => {
    if (!keys?.length) return 'None Selected';
    return keys.map(getMuscleGroupName).join(', ');
};

const renderGroupBadges = (keys, type) => {
    if (!keys?.length) return null;

    const classes = type === 'primary'
        ? 'bg-purple-600/20 border-purple-500/40 text-purple-200'
        : 'bg-blue-600/20 border-blue-500/40 text-blue-200';

    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {keys.map((key) => (
                <span key={`${type}-${key}`} className={`px-2 py-1 rounded-lg border text-xs ${classes}`}>
                    {getMuscleGroupName(key)}
                </span>
            ))}
        </div>
    );
};

export const EditExercisesModal = ({
    isOpen,
    exercises,
    onClose,
    onCreateExercise,
    onUpdateExercise,
    onDeleteExercise
}) => {
    const [editingId, setEditingId] = useState(null);
    const [formState, setFormState] = useState({
        name: '',
        primaryMuscleGroups: [],
        secondaryMuscleGroups: [],
        isBodyweight: false,
        isCardio: false
    });
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [exerciseSearch, setExerciseSearch] = useState('');

    const groupedExercises = useMemo(() => {
        const groups = new Map();

        (exercises || []).forEach((exercise) => {
            const isCardioExercise = Boolean(exercise.is_cardio);
            const groupKeys = isCardioExercise ? ['cardio'] : (getExercisePrimaryMuscleGroups(exercise).length > 0
                ? getExercisePrimaryMuscleGroups(exercise)
                : [getPrimaryMuscleGroupKey(exercise) || 'other']);

            groupKeys.forEach((groupKey) => {
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, []);
                }
                groups.get(groupKey).push(exercise);
            });
        });

        const orderedGroups = [];
        const displayGroups = [...MUSCLE_GROUPS, { key: 'cardio', name: 'Cardio' }];

        displayGroups.forEach((group) => {
            if (groups.has(group.key)) {
                orderedGroups.push({
                    key: group.key,
                    name: group.name,
                    exercises: groups.get(group.key).sort((a, b) => a.name.localeCompare(b.name))
                });
                groups.delete(group.key);
            }
        });

        if (groups.size > 0) {
            Array.from(groups.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([key, groupExercises]) => {
                    orderedGroups.push({
                        key,
                        name: getMuscleGroupName(key),
                        exercises: groupExercises.sort((a, b) => a.name.localeCompare(b.name))
                    });
                });
        }

        return orderedGroups;
    }, [exercises]);


    const filteredGroupedExercises = useMemo(() => {
        const term = exerciseSearch.trim().toLowerCase();
        if (!term) {
            return groupedExercises;
        }

        return groupedExercises
            .map((group) => ({
                ...group,
                exercises: group.exercises.filter((exercise) => exercise.name.toLowerCase().includes(term))
            }))
            .filter((group) => group.exercises.length > 0);
    }, [exerciseSearch, groupedExercises]);

    useEffect(() => {
        if (!isOpen) {
            setEditingId(null);
            setFormState({ name: '', primaryMuscleGroups: [], secondaryMuscleGroups: [], isBodyweight: false, isCardio: false });
            setError('');
            setIsSaving(false);
            setDeletingId(null);
            setExpandedGroups({});
            setExerciseSearch('');
        }
    }, [isOpen]);

    useScrollLock(isOpen);

    if (!isOpen) return null;

    const startEditing = (exercise) => {
        setEditingId(exercise.id);
        setFormState({
            name: exercise.name,
            primaryMuscleGroups: getExercisePrimaryMuscleGroups(exercise),
            secondaryMuscleGroups: getExerciseSecondaryMuscleGroups(exercise),
            isBodyweight: Boolean(exercise.is_bodyweight),
            isCardio: Boolean(exercise.is_cardio)
        });
        setError('');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setFormState({ name: '', primaryMuscleGroups: [], secondaryMuscleGroups: [], isBodyweight: false, isCardio: false });
        setError('');
        setIsSaving(false);
    };

    const handleSave = async () => {
        if (!editingId) return;

        const trimmedName = formState.name.trim();
        if (!trimmedName) {
            setError('Exercise name is required.');
            return;
        }

        if (!formState.isCardio && formState.primaryMuscleGroups.length === 0) {
            setError('Please select at least one primary muscle group.');
            return;
        }

        setIsSaving(true);
        try {
            await onUpdateExercise(editingId, {
                name: trimmedName,
                primaryMuscleGroups: formState.isCardio ? [] : formState.primaryMuscleGroups,
                secondaryMuscleGroups: formState.isCardio ? [] : formState.secondaryMuscleGroups,
                isBodyweight: formState.isCardio ? false : formState.isBodyweight,
                isCardio: formState.isCardio
            });
            cancelEditing();
        } catch (err) {
            setError(err.message || 'Failed to update exercise.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (exerciseId) => {
        if (!window.confirm('Delete this exercise? This cannot be undone.')) {
            return;
        }

        setDeletingId(exerciseId);
        try {
            await onDeleteExercise(exerciseId);
            if (editingId === exerciseId) {
                cancelEditing();
            }
        } catch (err) {
            setError(err.message || 'Failed to delete exercise.');
        } finally {
            setDeletingId(null);
        }
    };

    const editingExercise = exercises?.find((exercise) => exercise.id === editingId);

    const toggleGroup = (groupKey) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    const primaryOptions = MUSCLE_GROUPS.filter((group) => !formState.secondaryMuscleGroups.includes(group.key));
    const secondaryOptions = MUSCLE_GROUPS.filter((group) => !formState.primaryMuscleGroups.includes(group.key));

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border-x border-b border-gray-800 shadow-2xl w-full h-full overflow-y-auto">
                <div className="fixed top-0 left-0 right-0 z-20 bg-gray-900 pt-safe-top border-b border-gray-800">
                    <div className="px-6 pt-4 pb-3 flex items-center">
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                            <Dumbbell size={20} className="text-blue-500" />
                            Manage Exercises
                        </div>
                    </div>
                    <div className="px-6 pb-3 bg-gray-900">
                        <label className="sr-only" htmlFor="manage-exercise-search">Search exercises</label>
                        <input
                            id="manage-exercise-search"
                            type="search"
                            value={exerciseSearch}
                            onChange={(event) => setExerciseSearch(event.target.value)}
                            placeholder="Search exercises"
                            className="w-full rounded-xl bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="p-6 pt-[calc(env(safe-area-inset-top)+9rem)] pb-32">

                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {filteredGroupedExercises.length === 0 ? (
                        <div className="bg-gray-700/30 border border-gray-700 rounded-xl p-6 text-center text-gray-400">
                            {exerciseSearch.trim() ? 'No exercises match your search.' : 'You have no custom exercises yet.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredGroupedExercises.map((group) => (
                                <div key={group.key} className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.key)}
                                        className="w-full flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/70 px-4 py-3 text-left"
                                    >
                                        <span className="text-white font-semibold">{group.name}</span>
                                        <span className="text-xs text-gray-300">
                                            {expandedGroups[group.key] === false ? 'Show' : 'Hide'}
                                        </span>
                                    </button>
                                    {expandedGroups[group.key] !== false && (
                                        <div className="space-y-3">
                                            {group.exercises.map((exercise) => (
                                                <div key={`${group.key}-${exercise.id}`} className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="text-white font-semibold">{exercise.name}</div>
                                                            {exercise.is_cardio ? (
                                                                <span className="inline-block mt-2 px-2 py-1 rounded-lg border text-xs bg-teal-600/20 border-teal-500/40 text-teal-200">Cardio</span>
                                                            ) : (
                                                                <>
                                                                    {renderGroupBadges(getExercisePrimaryMuscleGroups(exercise), 'primary')}
                                                                    {renderGroupBadges(getExerciseSecondaryMuscleGroups(exercise), 'secondary')}
                                                                </>
                                                            )}
                                                            <div className="text-xs text-gray-400 mt-2">
                                                                {exercise.is_bodyweight ? 'Bodyweight' : 'Weighted'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditing(exercise)}
                                                                className="flex items-center gap-1 text-xs font-semibold text-blue-200 hover:text-white bg-blue-600/30 hover:bg-blue-600/50 px-3 py-1 rounded-full border border-blue-500/40 transition-colors"
                                                            >
                                                                <Pencil size={14} />
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(exercise.id)}
                                                                className="flex items-center gap-1 text-xs font-semibold text-red-200 hover:text-white bg-red-600/30 hover:bg-red-600/50 px-3 py-1 rounded-full border border-red-500/40 transition-colors disabled:opacity-50"
                                                                disabled={deletingId === exercise.id}
                                                            >
                                                                <Trash2 size={14} />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {editingExercise?.id === exercise.id && (
                                                        <div className="mt-4 bg-gray-800/70 border border-gray-700 rounded-xl p-4 space-y-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-300 mb-2">Exercise Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={formState.name}
                                                                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                                />
                                                            </div>

                                                            {!formState.isCardio && (
                                                                <>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-300 mb-2">Primary Muscle Groups *</label>
                                                                        <select
                                                                            multiple
                                                                            value={formState.primaryMuscleGroups}
                                                                            onChange={(event) => {
                                                                                const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
                                                                                setFormState((prev) => ({
                                                                                    ...prev,
                                                                                    primaryMuscleGroups: selectedValues
                                                                                }));
                                                                            }}
                                                                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-40"
                                                                            size={Math.min(6, primaryOptions.length || 1)}
                                                                        >
                                                                            {primaryOptions.map((groupOption) => (
                                                                                <option key={groupOption.key} value={groupOption.key}>
                                                                                    {groupOption.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        <p className="mt-2 text-xs text-gray-400">{toLabels(formState.primaryMuscleGroups)}</p>
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Muscle Groups</label>
                                                                        <select
                                                                            multiple
                                                                            value={formState.secondaryMuscleGroups}
                                                                            onChange={(event) => {
                                                                                const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
                                                                                setFormState((prev) => ({
                                                                                    ...prev,
                                                                                    secondaryMuscleGroups: selectedValues
                                                                                }));
                                                                            }}
                                                                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-40"
                                                                            size={Math.min(6, secondaryOptions.length || 1)}
                                                                        >
                                                                            {secondaryOptions.map((groupOption) => (
                                                                                <option key={groupOption.key} value={groupOption.key}>
                                                                                    {groupOption.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        <p className="mt-2 text-xs text-gray-400">{toLabels(formState.secondaryMuscleGroups)}</p>
                                                                    </div>
                                                                </>
                                                            )}

                                                            <label className={`flex items-center gap-3 text-sm ${formState.isCardio ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer text-gray-300'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formState.isBodyweight}
                                                                    onChange={(event) => setFormState((prev) => ({ ...prev, isBodyweight: event.target.checked }))}
                                                                    disabled={formState.isCardio}
                                                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600"
                                                                />
                                                                Bodyweight Exercise
                                                            </label>

                                                            <label className="flex items-center gap-3 text-sm cursor-pointer text-gray-300">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formState.isCardio}
                                                                    onChange={(event) => {
                                                                        const checked = event.target.checked;
                                                                        setFormState((prev) => ({
                                                                            ...prev,
                                                                            isCardio: checked,
                                                                            isBodyweight: checked ? false : prev.isBodyweight,
                                                                            primaryMuscleGroups: checked ? [] : prev.primaryMuscleGroups,
                                                                            secondaryMuscleGroups: checked ? [] : prev.secondaryMuscleGroups
                                                                        }));
                                                                    }}
                                                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-teal-500 focus:ring-teal-500"
                                                                />
                                                                Cardio Exercise
                                                            </label>

                                                            <div className="flex justify-end gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelEditing}
                                                                    className="px-4 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSave}
                                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                                                    disabled={isSaving}
                                                                >
                                                                    <Save size={16} />
                                                                    Save Changes
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 border-t border-gray-800 px-4 pt-3 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onCreateExercise()}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};
