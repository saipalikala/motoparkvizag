import { motion } from "framer-motion";
import "./WhyMotoPark.css";

const features = [
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
        title: "Premium Gear",
        desc: "Top quality riding gear sourced from trusted manufacturers worldwide."
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 5v4h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
        ),
        title: "Fast Delivery",
        desc: "Secure, tracked shipping across India — delivered in 2–3 business days."
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        ),
        title: "Secure Payments",
        desc: "Multiple payment options with end-to-end encrypted, safe checkout."
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        title: "Rider Approved",
        desc: "Chosen and trusted by thousands of riders across the country."
    }
];

const WhyMotoPark = () => (
    <section className="why-section">
        <div className="why-container">

            {/* HEADER */}
            <div className="why-header">
                <p className="why-eyebrow">Why Choose Us</p>
                <h2 className="why-title">Built for Riders</h2>
                <p className="why-subtitle">
                    Performance, safety, and reliability — in everything we offer
                </p>
            </div>

            {/* GRID */}
            <div className="why-grid">
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        className="why-card"
                        initial={{ opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                        viewport={{ once: true }}
                    >
                        <div className="why-card-accent" />

                        <div className="why-icon-wrap">
                            {f.icon}
                        </div>

                        <h3 className="why-card-title">{f.title}</h3>
                        <p className="why-card-desc">{f.desc}</p>
                    </motion.div>
                ))}
            </div>

        </div>
    </section>
);

export default WhyMotoPark;