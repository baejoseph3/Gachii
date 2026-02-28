/**
 * Send successful API response with a consistent envelope.
 */
export const sendSuccess = (res, status, data, meta) => {
    const payload = { data };
    if (meta) payload.meta = meta;
    return res.status(status).json(payload);
};

/**
 * Send standardized API errors so clients can handle failures uniformly.
 */
export const sendError = (res, status, message, code = 'REQUEST_ERROR', details) => {
    const payload = {
        error: {
            message,
            code,
            status
        }
    };

    if (details !== undefined) {
        payload.error.details = details;
    }

    return res.status(status).json(payload);
};

/**
 * Convert an unknown exception into a safe 500 response.
 */
export const handleUnexpectedError = (res, context, error) => {
    console.error(`${context}:`, error);
    return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
};
