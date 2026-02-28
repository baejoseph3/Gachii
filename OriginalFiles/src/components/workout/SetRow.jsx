import React from 'react';
import { Trash2 } from 'lucide-react';

export const SetRow = ({ setNumber, set, onUpdate, onRemove, isCardio, isBodyweight }) => {
    if (isCardio) {
        return (
            <div className="grid grid-cols-8 gap-3 mb-2">
                <div className="col-span-4">
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={set.duration ?? ''}
                        onChange={(e) => onUpdate('duration', e.target.value)}
                        placeholder={set.durationPlaceholder ?? "20"}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                </div>
                <div className="col-span-4">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={set.distance ?? ''}
                        onChange={(e) => onUpdate('distance', e.target.value)}
                        placeholder={set.distancePlaceholder ?? "1.5"}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-12 gap-3 mb-2">
            <div className="col-span-2 flex items-center">
                <span className="text-white font-bold text-lg">{setNumber}</span>
            </div>
            <div className="col-span-4">
                <input
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                    value={set.weight ?? ''}
                    onChange={(e) => onUpdate('weight', e.target.value)}
                    placeholder={set.weightPlaceholder ?? (isBodyweight ? 'Additional' : '135')}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
            </div>
            <div className="col-span-4">
                <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={set.reps ?? ''}
                    onChange={(e) => onUpdate('reps', e.target.value)}
                    placeholder={set.repsPlaceholder ?? '10'}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
            </div>
            <div className="col-span-2 flex items-center justify-center">
                <button onClick={onRemove} className="text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};
