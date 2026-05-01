import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
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