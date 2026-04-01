import axios from "axios"; // ✅ ADD THIS — was missing
import { API as BASE_URL } from "@/config/api";

const API = axios.create({
    baseURL: BASE_URL, // ✅ FIXED — was `${BASE_URL}/api` which made /api/api/
});

// ✅ Fixed: now accepts (email, password) to match AdminLogin.jsx
export const adminLogin = async (email, password) => {
    try {
        const res = await API.post("/admin/login", { email, password });
        return res.data;
    } catch (error) {
        throw error.response?.data || { message: "Login failed" };
    }
};

// ✅ Attach token to all requests automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;