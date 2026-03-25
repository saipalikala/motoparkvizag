import { motion } from "framer-motion";

const PageTransition = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;