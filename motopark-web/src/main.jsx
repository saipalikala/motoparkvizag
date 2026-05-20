import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";  // ← ADD

import "./index.css";
import App from "./App";
import { StoreConfigProvider } from "./context/StoreConfigContext";
import { ProductProvider }     from "@/context/ProductContext";
import { CartProvider }        from "@/context/CartContext";
import { WishlistProvider }    from "@/context/WishlistContext";
import { UserProvider }        from "@/context/UserContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>                  {/* ← ADD */}
      <BrowserRouter>
        <UserProvider>
          <ProductProvider>
            <CartProvider>
              <WishlistProvider>
                <StoreConfigProvider>
                  <App />
                </StoreConfigProvider>
              </WishlistProvider>
            </CartProvider>
          </ProductProvider>
        </UserProvider>
      </BrowserRouter>
    </HelmetProvider>                 {/* ← ADD */}
  </React.StrictMode>
);


// In main.jsx, after the ReactDOM.createRoot call

if (typeof window !== "undefined" && import.meta.env.PROD) {
  const BACKEND = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  setInterval(() => {
    fetch(`${BACKEND}/api/store-config`, { method: "HEAD" }).catch(() => {});
  }, 10 * 60 * 1000); // ping every 10 minutes
}