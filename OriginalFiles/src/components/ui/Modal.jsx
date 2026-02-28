import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const buildInitialInputValues = (fields) => fields.reduce((acc, field) => ({
    ...acc,
    [field.key]: field.defaultValue || ''
}), {});

export const Modal = ({ isOpen, onClose, title, message, buttons, input, inputs, checkbox, isBusy = false }) => {
    const normalizedInputs = useMemo(
        () => (inputs || (input ? [{ ...input, key: 'defaultInput', type: 'text', row: 1 }] : [])),
        [input, inputs]
    );
    const [inputValues, setInputValues] = useState(() => buildInitialInputValues(normalizedInputs));

    const inputRows = useMemo(() => {
        const rowMap = new Map();

        normalizedInputs.forEach((field, index) => {
            const rowKey = field.row || index + 1;
            if (!rowMap.has(rowKey)) {
                rowMap.set(rowKey, []);
            }
            rowMap.get(rowKey).push(field);
        });

        return Array.from(rowMap.entries())
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([, fields]) => fields);
    }, [normalizedInputs]);

    useEffect(() => {
        if (!isOpen) return;
        setInputValues(buildInitialInputValues(normalizedInputs));
    }, [isOpen, normalizedInputs]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isBusy) {
            return;
        }
        setInputValues(buildInitialInputValues(normalizedInputs));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <button onClick={handleClose} disabled={isBusy} className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-gray-300 mb-6">{message}</p>

                    {normalizedInputs.length > 0 && (
                        <div className="mb-6 space-y-4">
                            {inputRows.map((rowFields, rowIndex) => (
                                <div key={`row-${rowIndex}`} className={rowFields.length > 1 ? 'grid grid-cols-2 gap-4 w-full max-w-sm' : ''}>
                                    {rowFields.map((field, fieldIndex) => (
                                        <div
                                            key={field.key}
                                            className={rowFields.length > 1
                                                ? 'min-w-0'
                                                : ''}
                                        >
                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                {field.label}
                                            </label>
                                            <input
                                                type={field.type || 'text'}
                                                value={inputValues[field.key] || ''}
                                                onChange={(event) => setInputValues((prev) => ({
                                                    ...prev,
                                                    [field.key]: event.target.value
                                                }))}
                                                placeholder={field.placeholder}
                                                className={`min-w-0 w-full max-w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${(field.type === 'date' || field.type === 'time') ? 'appearance-none' : ''}`}
                                                autoFocus={rowIndex === 0 && fieldIndex === 0}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {checkbox && (
                        <label className="flex items-center gap-3 mb-6 text-gray-300 text-sm">
                            <input
                                type="checkbox"
                                checked={checkbox.checked}
                                onChange={checkbox.onChange}
                                disabled={isBusy}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600"
                            />
                            <span>{checkbox.label}</span>
                        </label>
                    )}

                    <div className="flex gap-3 justify-end">
                        {buttons.map((button, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    if (isBusy) {
                                        return;
                                    }
                                    if (button.requiresInput) {
                                        if (normalizedInputs.length <= 1) {
                                            button.onClick(inputValues.defaultInput || '');
                                        } else {
                                            button.onClick(inputValues);
                                        }
                                        setInputValues(buildInitialInputValues(normalizedInputs));
                                    } else {
                                        button.onClick();
                                    }
                                }}
                                disabled={isBusy}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${button.className}`}
                            >
                                {button.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
