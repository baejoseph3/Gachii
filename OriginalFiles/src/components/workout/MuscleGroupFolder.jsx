import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const MuscleGroupFolder = ({ groupKey, group, isExpanded, onToggle, selectedExercises, onToggleExercise }) => (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
        <button
            onClick={() => onToggle(groupKey)}
            className="w-full bg-gray-700 hover:bg-gray-600 p-4 flex items-center justify-between transition-all"
        >
            <div className="flex items-center gap-3">
                <span className="text-white font-semibold">{group.name}</span>
                <span className="text-gray-400 text-sm">({group.exercises.length} exercises)</span>
            </div>
            {isExpanded ? <ChevronDown className="text-gray-400" size={20} /> : <ChevronRight className="text-gray-400" size={20} />}
        </button>

        {isExpanded && (
            <div className="bg-gray-750 p-3">
                <div className="space-y-2">
                    {group.exercises.map((exercise) => {
                        const exerciseKey = `${groupKey}-${exercise.id}`;
                        const isSelected = selectedExercises.includes(exerciseKey);

                        return (
                            <label
                                key={exercise.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggleExercise(exerciseKey, groupKey, exercise)}
                                    className="w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="font-medium">{exercise.name}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
);