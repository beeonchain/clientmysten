const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
export const BACKEND_URL = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
