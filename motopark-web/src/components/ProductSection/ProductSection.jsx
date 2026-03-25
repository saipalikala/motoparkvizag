import { useProducts } from "@/context/ProductContext";
import ProductCard from "@/components/ProductCard/ProductCard";
import { useState, useEffect, useRef } from "react";

import "./ProductSection.css";

const ProductSection = ({ title, type }) => {

    const { products } = useProducts();

    const [visibleCount, setVisibleCount] = useState(
        type === "new" ? 6 : 100
    );

    const loaderRef = useRef(null);

    let items = [];

    /* ===========================
       FILTER PRODUCTS
    =========================== */

    if (type === "new") {

        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        items = products.filter(
            p => Date.now() - new Date(p.createdAt) < sevenDays
        );

    }

    else if (type === "featured") {

        items = products.filter(p => p.featured);

    }

    else if (type === "trending") {

        items = products.filter(p => p.trending);

    }

    else {

        items = products;

    }

    /* ===========================
       INFINITE SCROLL (ONLY NEW)
    =========================== */

    useEffect(() => {

        if (type !== "new") return;

        const observer = new IntersectionObserver(

            (entries) => {

                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => prev + 4);
                }

            },

            {
                rootMargin: "200px"
            }

        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();

    }, [type]);

    /* ===========================
       LIMIT PRODUCTS
    =========================== */

    const visibleProducts = items.slice(0, visibleCount);

    if (!items.length) return null;

    return (

        <section className="product-section">

            <div className="section-container">

                <div className="section-header">
                    <h2>{title}</h2>
                </div>

                <div className="product-grid">

                    {visibleProducts.map(product => (

                        <ProductCard
                            key={product._id}
                            product={product}
                        />

                    ))}

                </div>

                {/* Infinite scroll trigger */}

                {type === "new" && (

                    <div
                        ref={loaderRef}
                        className="scroll-loader"
                    />

                )}

            </div>

        </section>

    );

};

export default ProductSection;