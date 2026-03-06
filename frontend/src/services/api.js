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

// Authentication state management (tokens are stored in HttpOnly cookies by the server)
let _isAuthenticated = false;

export function setAuthenticated(isAuth) {
    _isAuthenticated = isAuth;
    if (!isAuth) {
        clearSessionCaches();
    }
}

export function isAuthenticated() {
    return _isAuthenticated;
}

// Guard against multiple concurrent auth redirects
let _isRedirecting = false;
// Track if we're currently refreshing to prevent multiple refresh calls
let _isRefreshing = false;
let _refreshPromise = null;

// Try to refresh the access token
async function tryRefreshToken() {
    if (_isRefreshing && _refreshPromise) {
        return _refreshPromise;
    }

    _isRefreshing = true;
    _refreshPromise = fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    }, 15000)
        .then(response => {
            if (response.ok) {
                _isAuthenticated = true;
                return true;
            }
            return false;
        })
        .catch(() => false)
        .finally(() => {
            _isRefreshing = false;
            _refreshPromise = null;
        });

    return _refreshPromise;
}

// Fetch with timeout to prevent indefinite hangs
function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(id));
}

// Generic API request helper with automatic token refresh
async function apiRequest(endpoint, options = {}, _retried = false) {
    const url = `${API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
        credentials: 'include',
    };

    try {
        let response = await fetchWithTimeout(url, config);

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
            // Handle unauthorized/forbidden globally (e.g., expired token)
            // Skip global redirect for auth endpoints — let caller handle those errors
            const isAuthEndpoint = endpoint.startsWith('/api/auth/');

            // If 401 and not an auth endpoint and we haven't retried, try refreshing
            // Note: also attempt when !_isAuthenticated (e.g. initializeAuth on page load)
            if (response.status === 401 && !isAuthEndpoint && !_retried) {
                const refreshed = await tryRefreshToken();
                if (refreshed) {
                    // Retry the original request
                    return apiRequest(endpoint, options, true);
                }
            }

            if ((response.status === 401 || response.status === 403) && !isAuthEndpoint) {
                const wasAuthenticated = _isAuthenticated;
                if (!_isRedirecting && wasAuthenticated) {
                    // Only treat as "session expired" when there was an active session.
                    _isRedirecting = true;
                    setAuthenticated(false);
                    window.location.href = '/login?expired=true';
                    return new Promise(() => { });
                }
                // No active session — throw so callers can handle it gracefully
                throw new Error('Unauthorized');
            }

            // Extract error message from backend response
            let errorMessage = 'Request failed';
            if (typeof data === 'object' && data !== null) {
                if (Array.isArray(data.detail)) {
                    errorMessage = data.detail.map(err => err.msg).join(', ');
                } else {
                    errorMessage = data.detail || data.message || 'Request failed';
                }
            } else if (typeof data === 'string' && data.trim()) {
                errorMessage = data;
            }
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        if (error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
}

export async function googleAuth(credential) {
    const data = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
    });

    // Mark as authenticated on successful login (tokens are in HttpOnly cookies)
    if (data.success) {
        setAuthenticated(true);
        // Cache user data
        if (data.user) {
            setEntry(apiCache.currentUser, data.user, CACHE_TTL_MS.currentUser);
        }
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
    clearRunsCache();
    return result;
}

export async function logout() {
    try {
        // Call server to clear HttpOnly cookies
        await apiRequest('/api/auth/logout', {
            method: 'POST',
        });
    } catch (error) {
        // Continue with local cleanup even if server call fails
        console.warn('Logout API call failed:', error);
    }
    setAuthenticated(false);
}

export async function refreshToken() {
    try {
        const data = await apiRequest('/api/auth/refresh', {
            method: 'POST',
        });
        if (data.success) {
            setAuthenticated(true);
            if (data.user) {
                setEntry(apiCache.currentUser, data.user, CACHE_TTL_MS.currentUser);
            }
        }
        return data;
    } catch (error) {
        // Refresh failed - user needs to re-login
        setAuthenticated(false);
        throw error;
    }
}

// Initialize authentication state by checking if we have a valid session
export async function initializeAuth() {
    try {
        const user = await apiRequest('/api/auth/check');
        if (user && user.id) {
            setAuthenticated(true);
            setEntry(apiCache.currentUser, user, CACHE_TTL_MS.currentUser);
            return user;
        }
    } catch {
        // Not authenticated or session expired
        setAuthenticated(false);
    }
    return null;
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

export async function optimizeResumeStream(jobDescription, resume, onEvent, inputType = null) {
    let response;
    try {
        const body = { job_description: jobDescription, resume };
        if (inputType) body.input_type = inputType;

        response = await fetchWithTimeout(`${API_URL}/api/agent/run/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(body),
        }, 60000);
    } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Cannot connect to backend. Ensure API server is running.');
    }

    // Handle 401 — try refresh and retry once
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            const retryBody = { job_description: jobDescription, resume };
            if (inputType) retryBody.input_type = inputType;

            try {
                response = await fetchWithTimeout(`${API_URL}/api/agent/run/stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(retryBody),
                }, 60000);
            } catch (e) {
                throw new Error(e.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Cannot connect to backend. Ensure API server is running.');
            }
        }
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

    try {
        while (true) {
            let readResult;
            try {
                readResult = await reader.read();
            } catch (streamError) {
                console.error('Stream read error:', streamError);
                if (finalResult) break;
                throw new Error('Connection to server lost during optimization. Please try again.');
            }

            const { done, value } = readResult;
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
    } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
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
    let response;
    try {
        response = await fetchWithTimeout(`${API_URL}/api/latex/compile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ latex_code: latexCode }),
        }, 60000);
    } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'Compilation timed out. Please try again.' : 'Cannot connect to backend compile service. Restart backend and try again.');
    }

    // Handle 401 — try refresh and retry once
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            try {
                response = await fetchWithTimeout(`${API_URL}/api/latex/compile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ latex_code: latexCode }),
                }, 60000);
            } catch (e) {
                throw new Error(e.name === 'AbortError' ? 'Compilation timed out. Please try again.' : 'Cannot connect to backend compile service. Restart backend and try again.');
            }
        }
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

export async function getUserResumes() {
    return apiRequest('/api/resume/list');
}

export async function createResume(data) {
    return apiRequest('/api/resume/create', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function analyzeResumeForATS(data) {
    return apiRequest('/api/resume/analyze', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function optimizeResumeBuilder(resumeData, selectedRecommendations) {
    return apiRequest('/api/resume/optimize', {
        method: 'POST',
        body: JSON.stringify({
            resume_data: resumeData,
            selected_recommendations: selectedRecommendations,
        }),
    });
}

export async function getResumePreview(resumeId, templateName) {
    let response = await fetchWithTimeout(`${API_URL}/api/resume/preview/${resumeId}/${templateName}`, {
        credentials: 'include',
    });

    // Handle 401 — try refresh and retry once
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            response = await fetchWithTimeout(`${API_URL}/api/resume/preview/${resumeId}/${templateName}`, {
                credentials: 'include',
            });
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to load preview');
    }
    return response.text();
}

export async function downloadResume(resumeId, templateName) {
    let response = await fetchWithTimeout(`${API_URL}/api/resume/download/${resumeId}/${templateName}`, {
        credentials: 'include',
    });

    // Handle 401 — try refresh and retry once
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            response = await fetchWithTimeout(`${API_URL}/api/resume/download/${resumeId}/${templateName}`, {
                credentials: 'include',
            });
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || 'Failed to download resume');
        error.status = response.status;
        throw error;
    }
    return response.blob();
}

export async function getResumeLatexSource(resumeId, templateName) {
    return apiRequest(`/api/resume/source/${resumeId}/${templateName}`);
}

export async function generateResumeBullets(data) {
    return apiRequest('/api/resume/generate-bullets', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function generateResumeSummary(data) {
    return apiRequest('/api/resume/generate-summary', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function generateProjectBullets(data) {
    return apiRequest('/api/resume/generate-project-bullets', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// Missing Skills endpoint
export async function findMissingSkills(resume, jobDescriptions) {
    return apiRequest('/api/agent/missing-skills', {
        method: 'POST',
        body: JSON.stringify({ resume, job_descriptions: jobDescriptions }),
    });
}

// Missing Skills History endpoints
export async function getMissingSkillsHistory(limit = 50) {
    return apiRequest(`/api/agent/missing-skills/history?limit=${limit}`);
}

export async function deleteMissingSkillsRun(runId) {
    return apiRequest(`/api/agent/missing-skills/${runId}`, {
        method: 'DELETE',
    });
}

// --- Template Preference Endpoints ---

export async function getTemplates() {
    return apiRequest('/api/agent/templates');
}

export function getTemplatePreviewUrl(templateId) {
    return `${API_URL}/api/agent/template-preview/${templateId}`;
}

export async function getTemplatePreference() {
    return apiRequest('/api/user/template-preference');
}

export async function setTemplatePreference(templateId) {
    return apiRequest('/api/user/template-preference', {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId }),
    });
}

export async function resetTemplatePreference() {
    return apiRequest('/api/user/template-preference', {
        method: 'DELETE',
    });
}

export async function addCustomTemplate(name, latex) {
    return apiRequest('/api/user/custom-template', {
        method: 'POST',
        body: JSON.stringify({ name, latex }),
    });
}

export async function updateCustomTemplate(index, name, latex) {
    return apiRequest(`/api/user/custom-template/${index}`, {
        method: 'PUT',
        body: JSON.stringify({ name, latex }),
    });
}

export async function deleteCustomTemplate(index) {
    return apiRequest(`/api/user/custom-template/${index}`, {
        method: 'DELETE',
    });
}

// Admin Endpoints
export async function getAdminUsers(page = 1, size = 15, search = '', sort = 'latest') {
    return apiRequest(`/api/admin/users?page=${page}&size=${size}&search=${encodeURIComponent(search)}&sort=${sort}`);
}

export async function updateAdminUserRole(userId, role) {
    return apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
    });
}

export async function deleteAdminUser(userId) {
    return apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
    });
}

export async function getAdminMetrics() {
    return apiRequest('/api/admin/metrics');
}

export async function getAdminActivityUsers(page = 1, size = 15, search = '', sort = 'latest') {
    return apiRequest(`/api/admin/activity/users?page=${page}&size=${size}&search=${encodeURIComponent(search)}&sort=${sort}`);
}

export async function getAdminActivityUserDetails(userId, page = 1, size = 15) {
    return apiRequest(`/api/admin/activity/users/${userId}?page=${page}&size=${size}`);
}

export async function getAdminTemplates() {
    return apiRequest('/api/admin/templates');
}

export async function getAdminTemplateContent(templateId) {
    return apiRequest(`/api/admin/templates/${templateId}`);
}

export async function updateAdminTemplate(templateId, name, preamble, description, tags) {
    return apiRequest(`/api/admin/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, preamble, description, tags }),
    });
}

export async function deleteAdminTemplate(templateId) {
    return apiRequest(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
    });
}

export async function getAdminDefaultTemplate() {
    return apiRequest('/api/admin/default-template');
}

export async function setAdminDefaultTemplate(templateId) {
    return apiRequest('/api/admin/default-template', {
        method: 'PUT',
        body: JSON.stringify({ template_id: templateId }),
    });
}

export async function updateAdminUserBlock(userId, isBlocked) {
    return apiRequest(`/api/admin/users/${userId}/block`, {
        method: 'PUT',
        body: JSON.stringify({ is_blocked: isBlocked }),
    });
}

export async function updateAdminUserTestStatus(userId, isTestUser) {
    return apiRequest(`/api/admin/users/${userId}/test-user`, {
        method: 'PUT',
        body: JSON.stringify({ is_test_user: isTestUser }),
    });
}

export async function getAdminGlobalActivity(page = 1, size = 5) {
    return apiRequest(`/api/admin/activity/global?page=${page}&size=${size}`);
}

export async function getAdminActivityLogDetails(activityType, entityId) {
    return apiRequest(`/api/admin/activity/details/${activityType}/${entityId}`);
}

// Maintenance Mode
export async function getMaintenanceStatus() {
    return apiRequest('/api/admin/maintenance-status');
}

export async function setMaintenanceMode(active) {
    return apiRequest('/api/admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify({ active }),
    });
}

// Support Endpoints
export async function createSupportTicket(data) {
    return apiRequest('/api/support', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getAdminSupportTickets(status = 'all') {
    return apiRequest(`/api/admin/support?status=${status}`);
}

export async function getAdminUnreadSupportCount() {
    return apiRequest(`/api/admin/support/unread/count`);
}

export async function markAdminSupportTicketRead(ticketId, isRead) {
    return apiRequest(`/api/admin/support/${ticketId}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ is_read: isRead }),
    });
}

export async function deleteAdminSupportTicket(ticketId) {
    return apiRequest(`/api/admin/support/${ticketId}`, {
        method: 'DELETE',
    });
}

export async function replyAdminSupportTicket(ticketId, replyMessage) {
    return apiRequest(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply_message: replyMessage }),
    });
}

export async function updateAdminSupportTicketStatus(ticketId, status) {
    return apiRequest(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}
