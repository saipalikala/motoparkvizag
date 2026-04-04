/* ================================================
   File: src/hooks/useGalleryBlur.js

   Usage in ProductDetail.jsx:
     const galleryRef = useGalleryBlur();
     <div ref={galleryRef} className="product-gallery-wrap">
       <ProductGallery ... />
     </div>
   ================================================ */
import { useRef, useEffect } from "react";

const useGalleryBlur = () => {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onScroll = () => {
            const rect = el.getBoundingClientRect();
            const ratio = -rect.top / rect.height;
            /* Start blurring once user has scrolled 30% past the gallery */
            if (ratio > 0.3) {
                el.classList.add("gallery-scroll-blur");
            } else {
                el.classList.remove("gallery-scroll-blur");
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return ref;
};

export default useGalleryBlur;