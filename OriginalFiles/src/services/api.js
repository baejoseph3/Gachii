const BASE_URL = '/api';

/**
 * Store the auth token in localStorage for persistence across sessions.
 */
export const setToken = (token) => {
    localStorage.setItem('authToken', token);
};

/**
 * Read the persisted auth token, if present.
 */
export const getToken = () => {
    return localStorage.getItem('authToken');
};

/**
 * Remove the auth token when logging out or on auth failure.
 */
export const clearToken = () => {
    localStorage.removeItem('authToken');
};

/**
 * Build the default headers for JSON requests.
 */
const buildJsonHeaders = (extraHeaders = {}) => ({
    'Content-Type': 'application/json',
    ...extraHeaders
});

/**
 * Build headers that include the bearer token for authenticated calls.
 */
const buildAuthHeaders = () => {
    const token = getToken();
    if (!token) throw new Error('No token');
    return buildJsonHeaders({ Authorization: `Bearer ${token}` });
};

/**
 * Parse a response body defensively, supporting empty and non-JSON responses.
 */
const parseResponseBody = async (response) => {
    const rawText = await response.text();
    if (!rawText) return {};
    try {
        return JSON.parse(rawText);
    } catch {
        return { message: rawText };
    }
};

/**
 * Normalize old/new API response envelopes.
 */
const unwrapApiPayload = (data) => {
    return data && typeof data === 'object' && 'data' in data ? data.data : data;
};

/**
 * Extract a meaningful error message from different backend response formats.
 */
const getApiErrorMessage = (data) => {
    if (!data || typeof data !== 'object') return 'Request failed';
    return data.error?.message || data.message || 'Request failed';
};

/**
 * Wrapper for JSON API requests that normalizes errors.
 */
const requestJson = async (path, { method = 'GET', headers, body } = {}) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: buildJsonHeaders(headers),
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
        throw new Error(getApiErrorMessage(data));
    }
    return unwrapApiPayload(data);
};

// Register
/**
 * Register a new user account.
 */
export const register = async ({ username, email, password }) => {
    const data = await requestJson('/auth/register', {
        method: 'POST',
        body: { username, email, password }
    });
    setToken(data.token);
    return data;
};

// Login (with username or email)
/**
 * Authenticate a user with a username/email and password.
 */
export const login = async ({ identifier, password }) => {
    const data = await requestJson('/auth/login', {
        method: 'POST',
        body: { identifier, password }
    });
    setToken(data.token);
    return data;
};

// Get current user
/**
 * Fetch the authenticated user's profile.
 */
export const getCurrentUser = async () => {
    return requestJson('/auth/me', { headers: buildAuthHeaders() });
};

// Admin list
/**
 * Fetch the admin list for management.
 */
export const getAdmins = async () => {
    return requestJson('/admin/list', { headers: buildAuthHeaders() });
};

/**
 * Promote a user to admin privileges.
 */
export const addAdmin = async (userId) => {
    return requestJson('/admin/add', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { userId }
    });
};

/**
 * Revoke a user's admin privileges.
 */
export const removeAdmin = async (userId) => {
    return requestJson('/admin/remove', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { userId }
    });
};

/**
 * Send a test push notification to a specific user.
 */
export const sendAdminPushTest = async ({ userIds, sendToAll, title, body }) => {
    const response = await fetch(`${BASE_URL}/admin/push-test`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({ userIds, sendToAll, title, body })
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
        const error = new Error(getApiErrorMessage(data) || 'Failed to send push notification');
        error.debug = data.debug || null;
        throw error;
    }
    return unwrapApiPayload(data);
};

/**
 * Register a device push token with the backend.
 */
export const registerPushToken = async (token) => {
    return requestJson('/notifications/register-token', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { token }
    });
};

/**
 * Unregister a device push token from the backend.
 */
export const unregisterPushToken = async (token) => {
    return requestJson('/notifications/unregister-token', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { token }
    });
};

// Update user settings
/**
 * Update user settings like sharing preferences.
 */
export const updateUserSettings = async (settings) => {
    return requestJson('/auth/settings', {
        method: 'PUT',
        headers: buildAuthHeaders(),
        body: settings
    });
};

/**
 * Save a completed workout to the backend.
 */
export const saveWorkout = async (workout) => {
    return requestJson('/workouts/save', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: workout
    });
};

// Get user's workouts
/**
 * Fetch the authenticated user's workouts.
 */
export const getWorkouts = async () => {
    return requestJson('/workouts/list', { headers: buildAuthHeaders() });
};

// Update workout
/**
 * Update a previously saved workout.
 */
export const updateWorkout = async (workout) => {
    return requestJson('/workouts/update', {
        method: 'PUT',
        headers: buildAuthHeaders(),
        body: workout
    });
};

/**
 * Delete a workout by id.
 */
export const deleteWorkout = async (workoutId) => {
    return requestJson('/workouts/delete', {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        body: { id: workoutId }
    });
};

// Search users
/**
 * Search for users by username/email for social connections.
 */
export const searchUsers = async (query) => {
    return requestJson(`/friends/search?query=${encodeURIComponent(query)}`, {
        headers: buildAuthHeaders()
    });
};

// Send friend request
/**
 * Send a friend request to another user.
 */
export const sendFriendRequest = async (friendId) => {
    return requestJson('/friends/send-request', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { friendId }
    });
};

// Get friend requests
/**
 * Fetch pending friend requests.
 */
export const getFriendRequests = async () => {
    return requestJson('/friends/requests', { headers: buildAuthHeaders() });
};

// Respond to friend request
/**
 * Accept or decline a friend request.
 */
export const respondToFriendRequest = async (requestId, accept) => {
    return requestJson('/friends/respond', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { requestId, accept }
    });
};

// Get friends list
/**
 * Fetch the list of current friends.
 */
export const getFriends = async () => {
    return requestJson('/friends/list', { headers: buildAuthHeaders() });
};

// Friend notification settings
/**
 * Fetch friend workout notification settings for the current user.
 */
export const getFriendNotificationSettings = async () => {
    return requestJson('/friends/notifications', { headers: buildAuthHeaders() });
};

/**
 * Update a notification setting for a friend.
 */
export const updateFriendNotificationSetting = async ({ friendId, notifyOnWorkout }) => {
    return requestJson('/friends/notifications', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { friendId, notifyOnWorkout }
    });
};

// Get friends' workout feed
/**
 * Fetch the social feed of friends' workouts.
 */
export const getFriendsFeed = async () => {
    return requestJson('/friends/feed', { headers: buildAuthHeaders() });
};

// Scheduled workouts
/**
 * Fetch scheduled workouts for the authenticated user.
 */
export const getScheduledWorkouts = async () => {
    return requestJson('/scheduled-workouts/list', { headers: buildAuthHeaders() });
};

/**
 * Create a scheduled workout entry.
 */
export const createScheduledWorkout = async (scheduledWorkout) => {
    return requestJson('/scheduled-workouts/create', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: scheduledWorkout
    });
};

/**
 * Delete a scheduled workout entry.
 */
export const deleteScheduledWorkout = async (scheduledWorkoutId) => {
    return requestJson('/scheduled-workouts/delete', {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        body: { id: scheduledWorkoutId }
    });
};

// Get friend profile
/**
 * Fetch profile stats for a friend connection.
 */
export const getFriendProfile = async (friendId) => {
    return requestJson(`/friends/profile?friendId=${encodeURIComponent(friendId)}`, {
        headers: buildAuthHeaders()
    });
};

// Comment on a workout
/**
 * Add a comment to a workout in the feed.
 */
export const addWorkoutComment = async ({ workoutId, comment }) => {
    return requestJson('/workouts/comment', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: { workoutId, comment }
    });
};

/**
 * Delete a comment from the feed.
 */
export const deleteWorkoutComment = async ({ commentId }) => {
    return requestJson('/workouts/comment', {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        body: { commentId }
    });
};

// Remove friend
/**
 * Remove a friend connection.
 */
export const removeFriend = async (friendId) => {
    return requestJson('/friends/remove', {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        body: { friendId }
    });
};

// Get custom exercises
/**
 * Fetch a user's custom exercises.
 */
export const getCustomExercises = async () => {
    return requestJson('/exercises/list', { headers: buildAuthHeaders() });
};

// Save custom exercise
/**
 * Save a custom exercise definition.
 */
export const saveCustomExercise = async (exercise) => {
    return requestJson('/exercises/save', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: exercise
    });
};

// Update custom exercise
/**
 * Update a saved custom exercise.
 */
export const updateCustomExercise = async (exercise) => {
    return requestJson('/exercises/update', {
        method: 'PUT',
        headers: buildAuthHeaders(),
        body: exercise
    });
};

// Delete custom exercise
/**
 * Delete a custom exercise by id.
 */
export const deleteCustomExercise = async (exerciseId) => {
    return requestJson('/exercises/delete', {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        body: { id: exerciseId }
    });
};

/**
 * Fetch saved custom workout routines.
 */
export const getCustomRoutines = async () => {
    return requestJson('/custom-routines/list', { headers: buildAuthHeaders() });
};

/**
 * Save a reusable custom workout routine.
 */
export const saveCustomRoutine = async (routine) => {
    return requestJson('/custom-routines/save', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: routine
    });
};

/**
 * Update an existing reusable custom workout routine.
 */
export const updateCustomRoutine = async (routine) => {
    return requestJson('/custom-routines/update', {
        method: 'PUT',
        headers: buildAuthHeaders(),
        body: routine
    });
};

/**
 * Delete a custom workout routine by id.
 */
export const deleteCustomRoutine = async (routineId) => {
    return requestJson('/custom-routines/delete', {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        body: { id: routineId }
    });
};

/**
 * Fetch all achievement definitions with current user's unlock state.
 */
export const getAchievements = async () => {
    return requestJson('/achievements/list', { headers: buildAuthHeaders() });
};

/**
 * Admin: create or update an achievement definition.
 */
export const upsertAchievementDefinition = async (definition) => {
    return requestJson('/achievements/definition', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: definition
    });
};
