import React from 'react';

export const StatCard = ({ label, value, status }) => (
    <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
        <div className="text-gray-400 text-sm mb-1">{label}</div>
        {status ? (
            <div className="text-green-400 font-bold text-xl flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                {value}
            </div>
        ) : (
            <div className="text-white font-bold text-3xl">{value}</div>
        )}
    </div>
);