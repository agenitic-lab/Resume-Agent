const API_URL = (import.meta.env.VITE_API_URL || '').trim();
const CACHE_TTL_MS = {
    apiKeyStatus: 2 * 60 * 1000,
    currentUser: 5 * 60 * 1000,
    runs: 60 * 1000,
};

const apiCache = {
    apiKeyStatus: { value: null, expiresAt: 0, promise: null },
    currentUser: { value: null, expiresAt: 0, promise: null },
    runsByLimit: new Map(),
};

function isFresh(entry) {
    return Boolean(entry && entry.value !== null && Date.now() < entry.expiresAt);
}

function setEntry(entry, value, ttlMs) {
    entry.value = value;
    entry.expiresAt = Date.now() + ttlMs;
}

function clearEntry(entry) {
    entry.value = null;
    entry.expiresAt = 0;
    entry.promise = null;
}

function clearRunsCache() {
    apiCache.runsByLimit.clear();
}

function clearSessionCaches() {
    clearEntry(apiCache.apiKeyStatus);
    clearEntry(apiCache.currentUser);
    clearRunsCache();
}

// Token management
export function setToken(token) {
    localStorage.setItem('token', token);
}

export function getToken() {
    return localStorage.getItem('token');
}

export function removeToken() {
    localStorage.removeItem('token');
}

export function isAuthenticated() {
    return !!getToken();
}

// Generic API request helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);
        let data = null;
        if (response.status !== 204) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        }

        if (!response.ok) {
            // Extract error message from backend response
            const errorMessage = (typeof data === 'object' && data !== null)
                ? (data.detail || data.message || 'Request failed')
                : (typeof data === 'string' && data.trim() ? data : 'Request failed');
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        if (error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
}

// Auth endpoints
export async function register(email, password) {
    return apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function login(email, password) {
    const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    // Store token on successful login
    if (data.access_token) {
        setToken(data.access_token);
    }

    return data;
}

export async function googleAuth(credential) {
    const data = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
    });

    // Store token on successful authentication
    if (data.access_token) {
        setToken(data.access_token);
    }

    return data;
}

export async function runOptimization(job_description, resume) {
    return apiRequest('/api/agent/run', {
        method: 'POST',
        body: JSON.stringify({ job_description, resume }),
    });
}

export async function getUserRuns(limit = 10, skip = 0) {
    return apiRequest(`/api/agent/runs?limit=${limit}&skip=${skip}`);
}

export async function getRunDetails(runId) {
    return apiRequest(`/api/agent/runs/${runId}`);
}

export async function deleteRun(runId) {
    const result = await apiRequest(`/api/agent/runs/${runId}`, {
        method: 'DELETE',
    });
    // Clear runs cache after deletion
    clearRunsCache();
    return result;
}

export async function logout() {
    removeToken();
    clearSessionCaches();
}

export async function getCurrentUser(options = {}) {
    const force = Boolean(options.force);
    const cacheEntry = apiCache.currentUser;

    if (!force && isFresh(cacheEntry)) {
        return cacheEntry.value;
    }
    if (!force && cacheEntry.promise) {
        return cacheEntry.promise;
    }

    cacheEntry.promise = apiRequest('/api/user/me')
        .then((data) => {
            setEntry(cacheEntry, data, CACHE_TTL_MS.currentUser);
            return data;
        })
        .finally(() => {
            cacheEntry.promise = null;
        });

    return cacheEntry.promise;
}

export function getCachedCurrentUser() {
    return isFresh(apiCache.currentUser) ? apiCache.currentUser.value : null;
}

export function getCachedApiKeyStatus() {
    return isFresh(apiCache.apiKeyStatus) ? apiCache.apiKeyStatus.value : null;
}

export async function getApiKeyStatus(options = {}) {
    const force = Boolean(options.force);
    const cacheEntry = apiCache.apiKeyStatus;

    if (!force && isFresh(cacheEntry)) {
        return cacheEntry.value;
    }
    if (!force && cacheEntry.promise) {
        return cacheEntry.promise;
    }

    cacheEntry.promise = apiRequest('/api/user/api-key/status')
        .then((data) => {
            setEntry(cacheEntry, data, CACHE_TTL_MS.apiKeyStatus);
            return data;
        })
        .finally(() => {
            cacheEntry.promise = null;
        });

    return cacheEntry.promise;
}

export async function saveApiKey(apiKey) {
    const result = await apiRequest('/api/user/api-key', {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey }),
    });
    setEntry(apiCache.apiKeyStatus, { has_api_key: true }, CACHE_TTL_MS.apiKeyStatus);
    return result;
}

export async function deleteApiKey() {
    const result = await apiRequest('/api/user/api-key', {
        method: 'DELETE',
    });
    setEntry(apiCache.apiKeyStatus, { has_api_key: false }, CACHE_TTL_MS.apiKeyStatus);
    return result;
}

// Agent endpoints
export async function optimizeResume(jobDescription, resume) {
    const result = await apiRequest('/api/agent/run', {
        method: 'POST',
        body: JSON.stringify({
            job_description: jobDescription,
            resume,
        }),
    });
    clearRunsCache();
    return result;
}

export async function getRuns(limit = 20, options = {}) {
    const force = Boolean(options.force);
    const key = String(limit);

    if (!apiCache.runsByLimit.has(key)) {
        apiCache.runsByLimit.set(key, { value: null, expiresAt: 0, promise: null });
    }
    const cacheEntry = apiCache.runsByLimit.get(key);

    if (!force && isFresh(cacheEntry)) {
        return cacheEntry.value;
    }
    if (!force && cacheEntry.promise) {
        return cacheEntry.promise;
    }

    cacheEntry.promise = apiRequest(`/api/agent/runs?limit=${limit}`)
        .then((data) => {
            setEntry(cacheEntry, data, CACHE_TTL_MS.runs);
            return data;
        })
        .finally(() => {
            cacheEntry.promise = null;
        });

    return cacheEntry.promise;
}

export function getCachedRuns(limit = 20) {
    const key = String(limit);
    const cacheEntry = apiCache.runsByLimit.get(key);
    return isFresh(cacheEntry) ? cacheEntry.value : null;
}

export async function getRun(runId) {
    return apiRequest(`/api/agent/runs/${runId}`);
}

export async function optimizeResumeStream(jobDescription, resume, onEvent) {
    const token = getToken();
    let response;
    try {
        response = await fetch(`${API_URL}/api/agent/run/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                job_description: jobDescription,
                resume,
            }),
        });
    } catch {
        throw new Error('Cannot connect to backend. Ensure API server is running.');
    }

    if (!response.ok) {
        let message = 'Optimization failed';
        try {
            const data = await response.json();
            message = data.detail || data.message || message;
        } catch {
            // Keep default message when non-JSON body is returned.
        }
        throw new Error(message);
    }

    if (!response.body) {
        throw new Error('Streaming response is not available in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
            const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
            let eventName = 'message';
            let dataText = '';

            for (const line of lines) {
                if (line.startsWith('event:')) {
                    eventName = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                    dataText += line.slice(5).trim();
                }
            }

            if (!dataText) continue;

            let payload = {};
            try {
                payload = JSON.parse(dataText);
            } catch {
                payload = { raw: dataText };
            }

            if (typeof onEvent === 'function') {
                onEvent({ event: eventName, data: payload });
            }

            if (eventName === 'completed' && payload.result) {
                finalResult = payload.result;
            }

            if (eventName === 'error') {
                throw new Error(payload.message || 'Optimization failed');
            }
        }
    }

    if (!finalResult) {
        throw new Error('Optimization finished without a final result payload.');
    }

    clearRunsCache();
    return finalResult;
}

export async function clearRunHistory() {
    const result = await apiRequest('/api/agent/runs', {
        method: 'DELETE',
    });
    clearRunsCache();
    return result;
}

export async function compileLatex(latexCode) {
    const token = getToken();
    let response;
    try {
        response = await fetch(`${API_URL}/api/latex/compile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ latex_code: latexCode }),
        });
    } catch {
        throw new Error('Cannot connect to backend compile service. Restart backend and try again.');
    }

    if (!response.ok) {
        let message = 'LaTeX compilation failed';
        try {
            const data = await response.json();
            message = data.detail || data.message || message;
        } catch {
            // Keep default error when non-JSON response body is returned.
        }
        throw new Error(message);
    }

    return response.blob();
}
