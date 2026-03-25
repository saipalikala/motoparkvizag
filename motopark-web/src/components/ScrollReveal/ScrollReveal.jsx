import { motion } from "framer-motion";

const ScrollReveal = ({ children }) => {

    return (

        <motion.div

            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true }}

            transition={{
                duration: 0.7,
                ease: "easeOut"
            }}

        >

            {children}

        </motion.div>

    );

};

export default ScrollReveal;
