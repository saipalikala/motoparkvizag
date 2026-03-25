import { createContext, useContext, useEffect, useState } from "react";

const StoreConfigContext = createContext();

export const StoreConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(null);

    useEffect(() => {
        fetch("/api/store-config")
            .then(res => res.json())
            .then(data => setConfig(data));
    }, []);

    return (
        <StoreConfigContext.Provider value={{ config }}>
            {children}
        </StoreConfigContext.Provider>
    );
};

export const useStoreConfig = () => useContext(StoreConfigContext);