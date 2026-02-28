import React from 'react';
import { Users, Calendar, Dumbbell, TrendingUp, User } from 'lucide-react';

export const BottomNavigation = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'social', label: 'Social', icon: Users },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'workout', label: 'Workout', icon: Dumbbell },
        { id: 'progress', label: 'Progress', icon: TrendingUp },
        { id: 'profile', label: 'Profile', icon: User }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-700">
            {/* Single gradient background extending through entire nav + safe area */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-safe-bottom">
                {/* Top padding for buttons */}
                <div className="pt-2 px-2">
                    <div className="flex items-center justify-around">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] min-h-[60px] ${
                                        isActive
                                            ? 'text-blue-500'
                                            : 'text-gray-400 active:scale-95'
                                    }`}
                                >
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                {/* Bottom spacing to prevent iOS gesture conflicts */}
                <div className="h-2" />
            </div>
        </div>
    );
};