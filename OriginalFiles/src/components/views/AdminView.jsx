import React, { useEffect, useState } from 'react';
import { Shield, Bell, UserPlus, UserMinus } from 'lucide-react';
import { addAdmin, getAdmins, removeAdmin, sendAdminPushTest } from '../../services/api';

export const AdminView = ({ currentUser }) => {
    const [admins, setAdmins] = useState([]);
    const [userIdInput, setUserIdInput] = useState('');
    const [notificationTitle, setNotificationTitle] = useState('Notification');
    const [notificationBody, setNotificationBody] = useState('This is a notification from the admin dashboard.');
    const [notificationUserIds, setNotificationUserIds] = useState('');
    const [sendToAllUsers, setSendToAllUsers] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState('');
    const [notificationDebug, setNotificationDebug] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const getDebugErrors = (debugPayload) => {
        if (!debugPayload) return [];
        if (Array.isArray(debugPayload.errors)) return debugPayload.errors.map((item) => String(item));
        if (Array.isArray(debugPayload.failures)) return debugPayload.failures.map((item) => String(item));
        if (typeof debugPayload.errors === 'string') return [debugPayload.errors];
        if (typeof debugPayload.error === 'string') return [debugPayload.error];
        return [];
    };

    const loadAdmins = async () => {
        try {
            const data = await getAdmins();
            setAdmins(data.admins || []);
        } catch (error) {
            console.error('Failed to load admins:', error);
        }
    };

    useEffect(() => {
        loadAdmins();
    }, []);

    useEffect(() => {
        if (currentUser?.id) {
            setNotificationUserIds(currentUser.id.toString());
        }
    }, [currentUser]);

    const handleAddAdmin = async () => {
        if (!userIdInput.trim()) return;
        try {
            await addAdmin(userIdInput.trim());
            setUserIdInput('');
            loadAdmins();
        } catch (error) {
            alert(error.message || 'Failed to add admin.');
        }
    };

    const handleRemoveAdmin = async (userId) => {
        if (userId === currentUser?.id) {
            alert('You cannot remove yourself as admin.');
            return;
        }
        try {
            await removeAdmin(userId);
            loadAdmins();
        } catch (error) {
            alert(error.message || 'Failed to remove admin.');
        }
    };

    const handleSendNotification = async () => {
        const parsedUserIds = notificationUserIds
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        if (!sendToAllUsers && parsedUserIds.length === 0) {
            setNotificationStatus('Enter at least one user ID or choose all users.');
            return;
        }

        setIsSending(true);
        setNotificationStatus('');
        setNotificationDebug(null);
        try {
            const response = await sendAdminPushTest({
                userIds: parsedUserIds,
                sendToAll: sendToAllUsers,
                title: notificationTitle || 'Notification',
                body: notificationBody || ''
            });
            setNotificationStatus(response.message || 'Push notification sent.');
            setNotificationDebug(response.debug || null);
            const debugErrors = getDebugErrors(response.debug);
            if (debugErrors.length) {
                setNotificationStatus('Firebase reported an error while sending the push.');
            }
        } catch (error) {
            console.error('Notification failed:', error);
            setNotificationStatus(error.message || 'Failed to send notification.');
            setNotificationDebug(error.debug || null);
        } finally {
            setIsSending(false);
        }
    };
    const debugErrors = getDebugErrors(notificationDebug);
    const hasUnsubscribedError = debugErrors.some((err) => err.includes('No registered push tokens'));
    const hasInvalidTokenError = notificationDebug?.failures?.some((failure) => {
        const errorText = String(failure?.error || '').toLowerCase();
        const codeText = String(failure?.code || '').toLowerCase();
        return errorText.includes('invalid argument') || codeText.includes('invalid-argument');
    });

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                    <Shield className="text-blue-400" size={28} />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                    </div>
                </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-white font-semibold mb-4">
                        <UserPlus size={18} className="text-blue-400" />
                        Manage Admins
                    </div>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={userIdInput}
                            onChange={(event) => setUserIdInput(event.target.value)}
                            placeholder="User ID to promote"
                            className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                            type="button"
                            onClick={handleAddAdmin}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                            Add
                        </button>
                    </div>
                    <div className="space-y-4">
                        {admins.map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3">
                                <div>
                                    <div className="text-white font-semibold">{admin.username}</div>
                                    <div className="text-xs text-gray-400">{admin.email}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAdmin(admin.id)}
                                    className="flex items-center gap-1 text-sm text-red-300 hover:text-red-200"
                                >
                                    <UserMinus size={16} />
                                    Remove
                                </button>
                            </div>
                        ))}
                        {admins.length === 0 && (
                            <div className="text-sm text-gray-400">No admins found.</div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-white font-semibold mb-4">
                        <Bell size={18} className="text-purple-400" />
                        Send Notifications
                    </div>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={sendToAllUsers}
                                onChange={(event) => setSendToAllUsers(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                            />
                            Send to all users
                        </label>
                        <input
                            type="text"
                            value={notificationUserIds}
                            onChange={(event) => setNotificationUserIds(event.target.value)}
                            disabled={sendToAllUsers}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                            placeholder="User IDs (comma-separated)"
                        />
                        <p className="text-xs text-gray-400">
                            Enter one or more user IDs separated by commas (e.g. 1, 2, 3) or choose all users. The server
                            will send to any FCM tokens registered for the selected users.
                        </p>
                        <input
                            type="text"
                            value={notificationTitle}
                            onChange={(event) => setNotificationTitle(event.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                            placeholder="Notification title"
                        />
                        <textarea
                            value={notificationBody}
                            onChange={(event) => setNotificationBody(event.target.value)}
                            rows={4}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                            placeholder="Notification body"
                        />
                        <button
                            type="button"
                            onClick={handleSendNotification}
                            disabled={isSending}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
                        >
                            {isSending ? 'Sending...' : 'Send Notification'}
                        </button>
                        {notificationStatus && (
                            <p className="text-xs text-gray-400">{notificationStatus}</p>
                        )}
                        {notificationDebug && (
                            <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3 text-xs text-gray-300">
                                <div className="font-semibold text-gray-200 mb-1">Server response</div>
                                <pre className="whitespace-pre-wrap break-words">
                                    {JSON.stringify(notificationDebug, null, 2)}
                                </pre>
                            </div>
                        )}
                        {hasUnsubscribedError && (
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                Firebase says the target user has no registered push tokens. Ask the user to enable push on
                                the device and confirm the Profile view shows an FCM token and permission = granted.
                            </div>
                        )}
                        {hasInvalidTokenError && (
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                Firebase reported an invalid token. This usually means the device token was generated for a
                                different Firebase project or the Web Push VAPID key changed. Re-enable push on the device to
                                generate a fresh FCM token.
                            </div>
                        )}
                        <p className="text-xs text-gray-400">
                            Push notifications require HTTPS, Firebase config, and user opt-in on the device.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
