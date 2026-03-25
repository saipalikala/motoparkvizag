import { useEffect, useState } from "react";
import "./ImagePickerModal.css";

const API = "http://localhost:5000/api/media";

export default function ImagePickerModal({ onSelect, onClose }) {

    const [media, setMedia] = useState([]);

    useEffect(() => {

        fetch(API)
            .then(res => res.json())
            .then(data => setMedia(data));

    }, []);

    return (

        <div className="picker-overlay">

            <div className="picker-modal">

                <div className="picker-header">

                    <h3>Select Image</h3>

                    <button onClick={onClose}>✕</button>

                </div>

                <div className="picker-grid">

                    {media.map(item => {

                        const url = `http://localhost:5000/${item.url}`;

                        return (

                            <img
                                key={item._id}
                                src={url}
                                onClick={() => {

                                    onSelect(url);
                                    onClose();

                                }}
                            />

                        );

                    })}

                </div>

            </div>

        </div>

    );

}