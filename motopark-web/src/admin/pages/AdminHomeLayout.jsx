import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// const API = "http://localhost:5000/api/home-layout";
import { API } from "@/config/api"; // ✅ ADD THIS

// ✅ Correct endpoint
const HOME_LAYOUT_API = `${API}/api/home-layout`;

export default function AdminHomeLayout() {

    const [sections, setSections] = useState([]);

    /* FETCH LAYOUT */

    useEffect(() => {

        fetch(HOME_LAYOUT_API)
            .then(res => res.json())
            .then(data => {

                const sorted = data.sections.sort((a, b) => a.order - b.order);

                setSections(sorted);

            });

    }, []);

    /* DRAG END */

    const onDragEnd = (result) => {

        if (!result.destination) return;

        const items = Array.from(sections);

        const [reordered] = items.splice(result.source.index, 1);

        items.splice(result.destination.index, 0, reordered);

        const updated = items.map((item, index) => ({

            ...item,
            order: index + 1

        }));

        setSections(updated);

    };

    /* TOGGLE */

    const toggleSection = (index) => {

        const updated = [...sections];

        updated[index].enabled = !updated[index].enabled;

        setSections(updated);

    };

    /* SAVE */

    const saveLayout = async () => {

        await fetch(HOME_LAYOUT_API, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ sections })
        });

        alert("Homepage layout saved");

    };

    return (

        <div style={{ padding: "30px" }}>

            <h2>Homepage Layout</h2>

            <DragDropContext onDragEnd={onDragEnd}>

                <Droppable droppableId="sections">

                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>

                            {sections.map((section, index) => (

                                <Draggable
                                    key={section._id}
                                    draggableId={section._id}
                                    index={index}
                                >

                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "14px",
                                                marginBottom: "10px",
                                                background: "#fff",
                                                border: "1px solid #eee",
                                                borderRadius: "8px",
                                                ...provided.draggableProps.style
                                            }}
                                        >

                                            <span>{section.key}</span>

                                            <label>

                                                <input
                                                    type="checkbox"
                                                    checked={section.enabled}
                                                    onChange={() => toggleSection(index)}
                                                />

                                                Enabled

                                            </label>

                                        </div>
                                    )}

                                </Draggable>

                            ))}

                            {provided.placeholder}

                        </div>
                    )}

                </Droppable>

            </DragDropContext>

            <button
                onClick={saveLayout}
                style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    background: "#ff6b3d",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px"
                }}
            >
                Save Layout
            </button>

        </div>

    );

}