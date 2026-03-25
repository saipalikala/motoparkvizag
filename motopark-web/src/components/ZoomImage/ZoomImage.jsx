import { useState } from "react";
import "./ZoomImage.css";

const ZoomImage = ({ src, alt }) => {

    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [zoom, setZoom] = useState(false);

    const handleMove = (e) => {

        const rect = e.currentTarget.getBoundingClientRect();

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setPosition({ x, y });

    };

    return (

        <div
            className="zoom-container"
            onMouseMove={handleMove}
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
        >

            <img
                src={src}
                alt={alt}
                className="zoom-image"
            />

            {zoom && (

                <div
                    className="zoom-lens"
                    style={{
                        backgroundImage: `url(${src})`,
                        backgroundPosition: `${position.x}% ${position.y}%`
                    }}
                />

            )}

        </div>

    );

};

export default ZoomImage;
