# WEB_ONLY_DROPS

## PWA/browser-only logic to remove from native iOS scope
- Service worker registration + messaging bootstrap.
- `firebase-messaging-sw.js` runtime behavior.
- Web app manifest install model (`manifest.webmanifest`).
- Browser localStorage token handling and active-workout snapshot handling (replace with Keychain + native persistence).
- Browser/mobile UA detection hooks (`useIsMobile`) and desktop/mobile split rendering.
- Touch-based custom pull-to-refresh mechanics tied to `window.scrollY`.
- Any visibility/reload/browser lifecycle mitigation patterns tied to PWA runtime assumptions.

## Firebase web messaging touchpoints to replace
- Frontend Firebase initialization and messaging support checks in `src/services/pushNotifications.js`.
- Public service worker push/click handlers in `public/firebase-messaging-sw.js`.
- Backend Firebase Admin multicast sender in `api/notifications/firebase.js` and admin push test path in `api/admin/[action].js`.
- Token register/unregister endpoint contracts in `api/notifications/[action].js` should be replaced with APNs/Supabase-compatible device registration model.
