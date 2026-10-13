import axios from "axios";

const baseURL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach authentication token to API requests.
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle authentication errors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";

    const hasStoredToken = Boolean(
      localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token")
    );

    if (
      error.response?.status === 401 &&
      hasStoredToken &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/register")
    ) {
      const keys = [
        "access_token",
        "token",
        "token_type",
        "user_id",
        "role",
        "refresh_token",
      ];

      for (const storage of [localStorage, sessionStorage]) {
        keys.forEach((key) => storage.removeItem(key));
      }

      window.dispatchEvent(new Event("auth:expired"));
    }

    return Promise.reject(error);
  }
);

export default api;
