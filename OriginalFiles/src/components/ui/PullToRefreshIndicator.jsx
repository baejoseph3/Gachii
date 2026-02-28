import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const PULL_TO_REFRESH_THRESHOLD = 80;

export const PullToRefreshIndicator = ({
    pullDistance = 0,
    threshold = PULL_TO_REFRESH_THRESHOLD,
    isRefreshing = false,
    idleLabel = 'Pull to refresh',
    loadingLabel = 'Refreshing…'
}) => {
    if (!isRefreshing && pullDistance <= 0) return null;

    const progress = Math.max(0, Math.min(pullDistance / threshold, 1));
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (circumference * (isRefreshing ? 1 : progress));

    return (
        <div className="mb-4 flex justify-center">
            <div className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-gray-700 bg-gray-800/80 px-4 py-2 text-sm text-gray-200 backdrop-blur">
                <span className="relative inline-flex h-6 w-6 items-center justify-center" aria-hidden="true">
                    <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r={radius} stroke="rgb(75 85 99)" strokeWidth="2" />
                        <circle
                            cx="12"
                            cy="12"
                            r={radius}
                            stroke="rgb(59 130 246)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            className="transition-all duration-150 ease-out"
                        />
                    </svg>
                    {isRefreshing && <LoaderCircle size={12} className="absolute animate-spin text-blue-400" />}
                </span>
                <span>{isRefreshing ? loadingLabel : progress >= 1 ? 'Release to refresh' : idleLabel}</span>
            </div>
        </div>
    );
};
