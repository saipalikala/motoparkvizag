import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api", // your backend URL
});

// 🔐 Admin Login API
export const adminLogin = async (credentials) => {
    try {
        const res = await API.post("/admin/login", credentials);
        return res.data;
    } catch (error) {
        throw error.response?.data || { message: "Login failed" };
    }
};