import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CategoryShowcase.css";

// const API = "http://localhost:5000/api/categories";

import { API } from "@/config/api"; // ✅ ADD THIS

// ✅ Correct endpoint
const CATEGORY_API = `${API}/categories`;

const CategoryShowcase = () => {

    const railRef = useRef(null);
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);

    useEffect(() => {

        fetch(CATEGORY_API)
            .then(res => res.json())
            .then(data => setCategories(data));

    }, []);

    const scroll = (dir) => {

        if (!railRef.current) return;

        railRef.current.scrollBy({
            left: dir === "left" ? -340 : 340,
            behavior: "smooth"
        });

    };

    return (

        <section className="category-showcase">

            {/* HEADER */}

            <header className="category-header">

                <div>
                    <h2>Explore Riding Gear</h2>
                    <p>Everything you need for your next ride</p>
                </div>

            </header>

            {/* RAIL */}

            <div className="category-rail-wrapper">

                <button
                    className="scroll-btn left"
                    onClick={() => scroll("left")}
                >
                    ‹
                </button>

                <div className="category-rail" ref={railRef}>

                    {categories.map(cat => (

                        <div
                            key={cat._id}
                            className="category-card"
                            onClick={() => navigate(`/category/${cat.slug}`)}
                        >

                            <img
                                src={cat.image || "/placeholder.png"}
                                alt={cat.name}
                                loading="lazy"
                            />

                            <div className="category-overlay">

                                <h3>{cat.name}</h3>

                                <button className="explore-btn">
                                    Explore →
                                </button>

                            </div>

                        </div>

                    ))}

                </div>

                <button
                    className="scroll-btn right"
                    onClick={() => scroll("right")}
                >
                    ›
                </button>

            </div>

        </section>

    );

};

export default CategoryShowcase;