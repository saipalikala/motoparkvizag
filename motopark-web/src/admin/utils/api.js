import axios from "axios";
import { API } from "@/config/api"; // ✅ pulls from the single source of truth

// ✅ API already ends with "/api" from src/config/api.js
//    so baseURL is correct — no /api/api double-prefix
const AdminAPI = axios.create({
    baseURL: API,
});

// ✅ Attach token to every request automatically
AdminAPI.interceptors.request.use((config) => {
    const token = localStorage.getItem("adminToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ✅ Guard: if the response is HTML instead of JSON, throw a clear error
AdminAPI.interceptors.response.use(
    (response) => response,
    (error) => {
        const contentType = error.response?.headers?.["content-type"] || "";
        if (contentType.includes("text/html")) {
            return Promise.reject(
                new Error(
                    `Received HTML instead of JSON from the backend. ` +
                    `Check that VITE_API_URL is set to your Railway URL in Vercel.`
                )
            );
        }
        return Promise.reject(error.response?.data || { message: "Request failed" });
    }
);

// ✅ accepts (email, password) to match AdminLogin.jsx
export const adminLogin = async (email, password) => {
    try {
        const res = await AdminAPI.post("/admin/login", { email, password });
        return res.data;
    } catch (error) {
        throw error.response?.data || error || { message: "Login failed" };
    }
};

export default AdminAPI;