
// Add at the very top, before React renders:
// Fire a cheap health-check immediately on page load.
// This starts the Render cold-start process 200-300ms earlier
// than waiting for React to mount and components to fetch.
if (typeof window !== "undefined") {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${base}/api/health`, { method: "GET", mode: "cors" }).catch(() => {});
}
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css"; /* Global CSS Variables and Resets */
import App from "./App";
import { StoreConfigProvider } from "./context/StoreConfigContext";
import { ProductProvider } from "@/context/ProductContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { UserProvider } from "@/context/UserContext";

ReactDOM.createRoot(document.getElementById("root")).render(
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
);