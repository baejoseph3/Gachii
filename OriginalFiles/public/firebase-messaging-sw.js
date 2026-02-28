/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

let initialized = false;

const initFirebase = (config) => {
    if (initialized || !config?.appId) return;
    firebase.initializeApp(config);
    firebase.messaging();
    initialized = true;
};

self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const payload = event.data.json();
            const title = payload?.notification?.title || payload?.data?.title || 'Workout App';
            const bodyText = payload?.notification?.body || payload?.data?.body || '';
            const options = {
                body: bodyText,
                data: payload?.data || {}
            };
            if (!bodyText && payload?.data?.message) {
                options.body = payload.data.message;
            }
            event.waitUntil(self.registration.showNotification(title, options));
        } catch {
            event.waitUntil(self.registration.showNotification('Workout App', { body: event.data.text() }));
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});

self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(Promise.resolve());
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'INIT_FIREBASE_MESSAGING') {
        initFirebase(event.data.config);
    }
});
