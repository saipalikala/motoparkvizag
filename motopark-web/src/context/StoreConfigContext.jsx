import { createContext, useContext, useEffect, useState } from "react";
import { API } from "@/config/api"; // ✅ ADDED

const StoreConfigContext = createContext();

export const StoreConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(null);

    useEffect(() => {
        fetch(`${API}/store-config`) // ✅ FIXED — was fetch("/api/store-config")
            .then(res => {
                if (!res.ok) throw new Error(`store-config failed (${res.status})`);
                const ct = res.headers.get("content-type") || "";
                if (!ct.includes("application/json"))
                    throw new Error("store-config returned HTML — check VITE_API_URL");
                return res.json();
            })
            .then(data => setConfig(data))
            .catch(err => console.error("[StoreConfig]", err.message));
    }, []);

    return (
        <StoreConfigContext.Provider value={{ config }}>
            {children}
        </StoreConfigContext.Provider>
    );
};

export const useStoreConfig = () => useContext(StoreConfigContext);