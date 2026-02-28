import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MUSCLE_GROUPS } from '../../data/exerciseData';
import { useScrollLock } from '../../hooks/useScrollLock';

const getSelectedLabel = (selectedKeys) => {
    if (!selectedKeys.length) {
        return 'None Selected';
    }

    return MUSCLE_GROUPS
        .filter((group) => selectedKeys.includes(group.key))
        .map((group) => group.name)
        .join(', ');
};

export const CreateExerciseModal = ({ isOpen, onClose, onSubmit }) => {
    const [exerciseName, setExerciseName] = useState('');
    const [primaryMuscleGroups, setPrimaryMuscleGroups] = useState([]);
    const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState([]);
    const [isBodyweight, setIsBodyweight] = useState(false);
    const [isCardio, setIsCardio] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useScrollLock(isOpen);

    if (!isOpen) return null;

    const handleClose = () => {
        setExerciseName('');
        setPrimaryMuscleGroups([]);
        setSecondaryMuscleGroups([]);
        setIsBodyweight(false);
        setIsCardio(false);
        setError('');
        setIsSubmitting(false);
        onClose();
    };

    const primaryOptions = MUSCLE_GROUPS.filter((group) => !secondaryMuscleGroups.includes(group.key));
    const secondaryOptions = MUSCLE_GROUPS.filter((group) => !primaryMuscleGroups.includes(group.key));

    const handleSubmit = async () => {
        if (isSubmitting) return;

        if (!exerciseName.trim()) {
            setError('Exercise name is required');
            return;
        }

        if (!isCardio && primaryMuscleGroups.length === 0) {
            setError('Please select at least one primary muscle group');
            return;
        }

        const exerciseData = {
            name: exerciseName.trim(),
            primaryMuscleGroups: isCardio ? [] : primaryMuscleGroups,
            secondaryMuscleGroups: isCardio ? [] : secondaryMuscleGroups,
            isBodyweight: isCardio ? false : isBodyweight,
            isCardio
        };

        setIsSubmitting(true);
        try {
            await onSubmit(exerciseData);
            handleClose();
        } catch (err) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white">Create Custom Exercise</h3>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            disabled={isSubmitting}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-medium mb-2">Exercise Name *</label>
                        <input
                            type="text"
                            value={exerciseName}
                            onChange={(e) => setExerciseName(e.target.value)}
                            placeholder="e.g., Cable Crossover"
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>

                    {!isCardio && (
                        <>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-medium mb-2">Primary Muscle Groups *</label>
                                <select
                                    multiple
                                    value={primaryMuscleGroups}
                                    onChange={(event) => {
                                        const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
                                        setPrimaryMuscleGroups(selectedValues);
                                    }}
                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-40"
                                    disabled={isSubmitting}
                                    size={Math.min(6, primaryOptions.length || 1)}
                                >
                                    {primaryOptions.map((group) => (
                                        <option key={group.key} value={group.key}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-gray-400">{getSelectedLabel(primaryMuscleGroups)}</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-medium mb-2">Secondary Muscle Groups</label>
                                <select
                                    multiple
                                    value={secondaryMuscleGroups}
                                    onChange={(event) => {
                                        const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
                                        setSecondaryMuscleGroups(selectedValues);
                                    }}
                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-40"
                                    disabled={isSubmitting}
                                    size={Math.min(6, secondaryOptions.length || 1)}
                                >
                                    {secondaryOptions.map((group) => (
                                        <option key={group.key} value={group.key}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-gray-400">{getSelectedLabel(secondaryMuscleGroups)}</p>
                            </div>
                        </>
                    )}

                    <div className="mb-6 space-y-3">
                        <label className={`flex items-center gap-3 ${isCardio ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer text-gray-300'}`}>
                            <input
                                type="checkbox"
                                checked={isBodyweight}
                                onChange={(e) => setIsBodyweight(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting || isCardio}
                            />
                            <span className="text-sm">Bodyweight Exercise</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer text-gray-300">
                            <input
                                type="checkbox"
                                checked={isCardio}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsCardio(checked);
                                    if (checked) {
                                        setPrimaryMuscleGroups([]);
                                        setSecondaryMuscleGroups([]);
                                        setIsBodyweight(false);
                                    }
                                }}
                                className="w-5 h-5 rounded border-gray-600 text-teal-500 focus:ring-2 focus:ring-teal-500"
                                disabled={isSubmitting}
                            />
                            <span className="text-sm">Cardio Exercise</span>
                        </label>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                                isSubmitting
                                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Exercise'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
