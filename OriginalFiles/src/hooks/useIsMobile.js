import { useState, useEffect } from 'react';

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            // Check user agent for mobile devices
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

            // Check screen width (phones are typically under 768px)
            const isMobileWidth = window.innerWidth < 768;

            // Check if it's a touch device
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Device is mobile if it matches UA AND has small screen
            // OR if it's specifically an iOS/Android device regardless of screen size
            const isIOS = /iphone|ipod/i.test(userAgent.toLowerCase());
            const isAndroid = /android/i.test(userAgent.toLowerCase());

            return (isMobileUA && isMobileWidth) || isIOS || isAndroid;
        };

        setIsMobile(checkIfMobile());

        // Re-check on window resize
        const handleResize = () => {
            setIsMobile(checkIfMobile());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
};