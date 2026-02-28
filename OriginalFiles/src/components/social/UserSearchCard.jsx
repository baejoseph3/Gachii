import React from 'react';
import { UserPlus } from 'lucide-react';

export const UserSearchCard = ({ user, onSendRequest, requestSent }) => (
    <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 flex justify-between items-center">
        <div>
            <div className="text-white font-semibold">{user.username}</div>
            <div className="text-gray-400 text-sm">{user.email}</div>
        </div>
        <button
            onClick={() => onSendRequest(user.id)}
            disabled={requestSent}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                requestSent
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
            <UserPlus size={18} />
            {requestSent ? 'Sent' : 'Add'}
        </button>
    </div>
);