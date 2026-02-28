import React from 'react';
import { User } from 'lucide-react';

export const FriendCard = ({ friend, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(friend)}
        className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 flex items-center justify-between gap-3 text-left w-full hover:border-blue-500/70 hover:bg-gray-700/70 transition"
    >
        <div className="flex items-center gap-3 flex-1">
            <div className="bg-blue-600 p-3 rounded-full">
                <User size={20} className="text-white" />
            </div>
            <div>
                <div className="text-white font-semibold">{friend.username}</div>
                <div className="text-gray-400 text-sm">{friend.email}</div>
            </div>
        </div>
    </button>
);
