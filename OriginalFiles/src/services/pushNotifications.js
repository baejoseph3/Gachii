import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

/**
 * Read Firebase config from Vite environment variables.
 */
export const getFirebaseConfig = () => ({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
});

/**
 * Initialize Firebase once and reuse the app instance.
 */
const getFirebaseApp = () => {
    const config = getFirebaseConfig();
    if (!getApps().length) {
        return initializeApp({
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId
        });
    }
    return getApp();
};

/**
 * Retrieve a Firebase Messaging instance when supported by the browser.
 */
export const getMessagingIfSupported = async () => {
    const supported = await isSupported();
    if (!supported) return null;
    const app = getFirebaseApp();
    return getMessaging(app);
};

/**
 * Register or reuse the service worker for Firebase Messaging.
 */
export const getServiceWorkerRegistration = async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const config = getFirebaseConfig();
        const target = registration.active || registration.waiting || registration.installing;
        if (target && config?.appId) {
            target.postMessage({
                type: 'INIT_FIREBASE_MESSAGING',
                config: {
                    apiKey: config.apiKey,
                    authDomain: config.authDomain,
                    projectId: config.projectId,
                    storageBucket: config.storageBucket,
                    messagingSenderId: config.messagingSenderId,
                    appId: config.appId
                }
            });
        }
        return registration;
    } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
    }
};
