// import axios from "axios";

// const API = axios.create({
//     baseURL: "http://localhost:5000/api", // your backend URL
// });

// // 🔐 Admin Login API
// export const adminLogin = async (credentials) => {
//     try {
//         const res = await API.post("/admin/login", credentials);
//         return res.data;
//     } catch (error) {
//         throw error.response?.data || { message: "Login failed" };
//     }
// };

import axios from "axios";
import { API as BASE_URL } from "@/config/api"; // ✅ ADD THIS

// ✅ Create axios instance with dynamic backend URL
const API = axios.create({
    baseURL: `${BASE_URL}/api`,
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