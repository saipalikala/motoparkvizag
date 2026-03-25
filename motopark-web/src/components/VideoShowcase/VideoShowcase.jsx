import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./VideoShowcase.css";
// import Video from "@/videos/rider.mp4";

function VideoShowcase() {

    const navigate = useNavigate();

    return (
        <section className="video-showcase">

            {/* VIDEO */}
            {/* <video
                autoPlay
                muted
                loop
                playsInline
                className="video-bg"
            >
                <source src={Video} type="video/mp4" />
            </video> */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="video-bg"
            >
                <source src="/videos/rider.mp4" type="video/mp4" />
            </video>

            {/* LAYERED OVERLAY — cinematic + brand navy at bottom */}
            <div className="video-overlay" />

            {/* CONTENT */}
            <div className="video-content">

                <motion.span
                    className="video-tag"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    MotoPark Experience
                </motion.span>

                <motion.h2
                    className="video-title"
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.18 }}
                >
                    The Road<br />Is Yours.
                </motion.h2>

                <motion.p
                    className="video-desc"
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.34 }}
                >
                    Premium riding gear built for performance,
                    protection and adventure.
                </motion.p>

                <motion.div
                    className="video-actions"
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                >
                    <button
                        className="explore-btn explore-btn--primary"
                        onClick={() => navigate("/store")}
                    >
                        Explore Gear
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
                                stroke="currentColor" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <button
                        className="explore-btn explore-btn--ghost"
                        onClick={() => navigate("/about")}
                    >
                        Our Story
                    </button>
                </motion.div>

            </div>

            {/* SCROLL INDICATOR */}
            <motion.div
                className="scroll-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
            >
                <span>Scroll</span>
                <div className="scroll-line">
                    <div className="scroll-dot" />
                </div>
            </motion.div>

        </section>
    );
}

export default VideoShowcase;