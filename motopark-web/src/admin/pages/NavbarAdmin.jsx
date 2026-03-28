import { API } from "@/config/api";
const NAVBAR_API = `${API}/navbar`;

const updateNavbar = async () => {

    await fetch(NAVBAR_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(navbarData)
    })

}