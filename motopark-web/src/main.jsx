/**
 * src/main.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] React.StrictMode intentionally KEPT
 *      StrictMode is a no-op in production builds.
 *      In dev it double-invokes effects to catch bugs early.
 *      With apiCache.js in place, the double-mount fires
 *      exactly 1 network call (second mount hits in-flight cache).
 *      Removing StrictMode would hide real bugs.
 *
 * [F2] Provider order preserved
 *      UserProvider wraps everything so auth state is available
 *      to all other providers (ProductProvider may eventually
 *      need user context for personalized data).
 *
 * [F3] No changes to provider nesting
 *      The nesting order is correct. StoreConfigProvider is
 *      innermost because it's least likely to cause re-renders
 *      that affect the outer providers.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App";
import { StoreConfigProvider } from "./context/StoreConfigContext";
import { ProductProvider }     from "@/context/ProductContext";
import { CartProvider }        from "@/context/CartContext";
import { WishlistProvider }    from "@/context/WishlistContext";
import { UserProvider }        from "@/context/UserContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>  {/* [F1]: KEEP — safe with apiCache.js */}
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
  </React.StrictMode>
);