/* ================================
   API CONFIG
================================ */

export const API =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ================================
   TOKEN
================================ */

const getToken = () => localStorage.getItem("adminToken");

const headers = (isFormData = false) => {
    const h = {
        Authorization: `Bearer ${getToken()}`
    };
    if (!isFormData) h["Content-Type"] = "application/json";
    return h;
};

/* ================================
   GENERIC REQUEST
================================ */

const req = async (method, path, body = null, isFormData = false) => {
    const options = { method, headers: headers(isFormData) };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API}${path}`, options);

    if (res.status === 401) {
        localStorage.removeItem("adminToken");
        window.location.href = "/admin/login";
        return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
};

/* ================================
   UPLOAD (FIXED)
================================ */

export const uploadCarousel = (formData) =>
    req("POST", "/upload/carousel", formData, true);