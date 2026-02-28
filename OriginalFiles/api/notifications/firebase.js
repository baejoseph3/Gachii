import admin from 'firebase-admin';

let firebaseApp;

const getMessaging = () => {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
        return { error: 'Firebase service account is not configured.' };
    }

    if (!firebaseApp) {
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (error) {
            console.error('Invalid Firebase service account JSON:', error);
            return { error: 'Firebase service account JSON is invalid.' };
        }
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    return { messaging: admin.messaging(firebaseApp) };
};

const stringifyDataValues = (data) => {
    if (!data) return undefined;
    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
    );
};

export const sendPushNotification = async ({ tokens, title, message, data }) => {
    const uniqueTokens = [...new Set(tokens || [])];
    if (!uniqueTokens.length) {
        return { ok: false, error: 'No registered push tokens for user.' };
    }

    const { messaging, error } = getMessaging();
    if (!messaging) {
        return { ok: false, error };
    }

    try {
        const payload = {
            tokens: uniqueTokens,
            data: stringifyDataValues({
                title,
                body: message,
                ...(data || {})
            })
        };

        const response = await messaging.sendEachForMulticast(payload);
        const failures = response.responses
            .map((result, index) => (result.success ? null : {
                token: uniqueTokens[index],
                error: result.error?.message,
                code: result.error?.code
            }))
            .filter(Boolean);

        return {
            ok: response.failureCount === 0,
            data: {
                successCount: response.successCount,
                failureCount: response.failureCount,
                failures
            }
        };
    } catch (error) {
        console.error('Firebase push error:', error);
        return { ok: false, error: 'Failed to send push notification.' };
    }
};
