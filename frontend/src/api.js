import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api", // Change to your backend API base URL if needed
});

// Request interceptor: Attach JWT token to all requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor: Handle auth errors globally
api.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      // Remove token/user and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("ntc-user");
      // You can add any state reset logic here if needed
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    // Pass error to component for further handling (display message, etc.)
    return Promise.reject(error);
  }
);

export default api;
