export const FRONTEND_URL = "http://localhost:5173";
export const BACKEND_URL = "http://localhost:4000";
export const API_URL = `${BACKEND_URL}/api`;

// A separate MongoDB database from the one used for everyday manual dev
// poking-around, so e2e runs never collide with or wipe local dev data.
export const E2E_MONGODB_URI = "mongodb://localhost:27017/provisio_e2e";

export const E2E_ADMIN_EMAIL = "e2e-admin@provisio.local";
export const E2E_ADMIN_PASSWORD = "e2e-admin-password";
export const E2E_ADMIN_NAME = "E2E Admin";
