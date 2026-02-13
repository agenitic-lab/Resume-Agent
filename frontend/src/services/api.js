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

export async function logout() {
    removeToken();
}
