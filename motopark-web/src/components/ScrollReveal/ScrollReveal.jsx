import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

const ScrollReveal = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
                duration: 0.7,
                ease: EASE
            }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;
