import { useEffect, useRef } from 'react';

export const useScrollLock = (isLocked) => {
    const scrollPosition = useRef(0);

    useEffect(() => {
        if (!isLocked) return undefined;

        const { body } = document;
        const originalStyle = {
            overflow: body.style.overflow,
            position: body.style.position,
            top: body.style.top,
            width: body.style.width
        };

        scrollPosition.current = window.scrollY || window.pageYOffset;
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollPosition.current}px`;
        body.style.width = '100%';

        return () => {
            body.style.overflow = originalStyle.overflow;
            body.style.position = originalStyle.position;
            body.style.top = originalStyle.top;
            body.style.width = originalStyle.width;
            window.scrollTo(0, scrollPosition.current);
        };
    }, [isLocked]);
};
