import React from 'react';
import { Check, X } from 'lucide-react';

export const FriendRequestCard = ({ request, onAccept, onReject }) => (
    <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 flex justify-between items-center">
        <div>
            <div className="text-white font-semibold">{request.username}</div>
            <div className="text-gray-400 text-sm">{request.email}</div>
            <div className="text-gray-500 text-xs mt-1">
                {new Date(request.created_at).toLocaleDateString()}
            </div>
        </div>
        <div className="flex gap-2">
            <button
                onClick={() => onAccept(request.id)}
                className="flex items-center gap-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-3 py-2 rounded-lg transition-all"
            >
                <Check size={16} />
                Accept
            </button>
            <button
                onClick={() => onReject(request.id)}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-all"
            >
                <X size={16} />
                Reject
            </button>
        </div>
    </div>
);