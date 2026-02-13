const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
        const data = await response.json();

        if (!response.ok) {
            // Extract error message from backend response
            const errorMessage = data.detail || data.message || 'Request failed';
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

export async function logout() {
    removeToken();
}

export async function getCurrentUser() {
    return apiRequest('/api/auth/me');
}
