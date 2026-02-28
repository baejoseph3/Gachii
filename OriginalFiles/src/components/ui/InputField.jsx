import React from 'react';

export const InputField = ({ label, icon: Icon, type = "text", value, onChange, onKeyPress, placeholder, error }) => (
    <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">{label}</label>
        <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
                type={type}
                value={value}
                onChange={onChange}
                onKeyPress={onKeyPress}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder={placeholder}
            />
        </div>
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
);