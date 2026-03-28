import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import SectionCard from "@/admin/components/HomeBuilder/SectionCard";
import SectionSettingsModal from "@/admin/components/HomeBuilder/SectionSettingsModal";
import "./HomeBuilder.css";

// const API = "http://localhost:5000/api/home-layout";

import { API } from "@/config/api"; // ✅ ADD

// ✅ Correct endpoint
const HOME_LAYOUT_API = `${API}/home-layout`;


const SaveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;

export default function HomeBuilder() {
    const [sections, setSections] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(HOME_LAYOUT_API)
            .then(r => r.json())
            .then(data => {
                const sorted = (data.sections || []).sort((a, b) => a.order - b.order);
                setSections(sorted);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(sections);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);
        setSections(items.map((s, i) => ({ ...s, order: i + 1 })));
    };

    const toggleSection = (index) => {
        const updated = [...sections];
        updated[index].enabled = !updated[index].enabled;
        setSections(updated);
    };

    const saveSettings = (settings) => {
        setSections(sections.map(s =>
            s._id === activeSection._id ? { ...s, settings } : s
        ));
        setActiveSection(null);
    };

    const saveLayout = async () => {
        setSaving(true);
        try {
            await fetch(HOME_LAYOUT_API, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sections }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const enabledCount = sections.filter(s => s.enabled).length;
    const disabledCount = sections.length - enabledCount;

    return (
        <div className="hb-page">

            {/* HEADER */}
            <div className="hb-header">
                <div>
                    <p className="hb-eyebrow">Homepage</p>
                    <p className="hb-hint">Drag to reorder sections · Toggle to show/hide · Click settings to configure</p>
                </div>
                <div className="hb-header-stats">
                    <span className="hb-stat hb-stat--on">{enabledCount} visible</span>
                    <span className="hb-stat hb-stat--off">{disabledCount} hidden</span>
                </div>
            </div>

            {/* LEGEND */}
            <div className="hb-legend">
                <div className="hb-legend-item"><span className="hb-legend-dot hb-legend-dot--on" />Visible on homepage</div>
                <div className="hb-legend-item"><span className="hb-legend-dot hb-legend-dot--off" />Hidden</div>
                <div className="hb-legend-item"><span style={{ fontSize: 11, color: "#aeaeb2" }}>☰ Drag handle to reorder</span></div>
            </div>

            {/* SECTIONS */}
            {loading ? (
                <div className="hb-loading">Loading layout…</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="sections">
                        {provided => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="hb-sections">
                                {sections.map((section, index) => (
                                    <Draggable key={section._id} draggableId={section._id} index={index}>
                                        {(prov, snapshot) => (
                                            <div
                                                ref={prov.innerRef}
                                                {...prov.draggableProps}
                                                className={`hb-section-wrap ${snapshot.isDragging ? "hb-section-wrap--dragging" : ""}`}
                                                style={prov.draggableProps.style}
                                            >
                                                <SectionCard
                                                    section={section}
                                                    toggleSection={() => toggleSection(index)}
                                                    openSettings={setActiveSection}
                                                    dragProps={prov.dragHandleProps}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {/* SAVE BAR */}
            <div className="hb-save-bar">
                <p className="hb-save-hint">{sections.length} sections · Changes go live after saving</p>
                <button
                    className={`hb-save-btn ${saved ? "hb-save-btn--saved" : ""}`}
                    onClick={saveLayout}
                    disabled={saving}
                >
                    {saved ? <><CheckIcon /> Saved!</>
                        : saving ? <><span className="hb-spinner" /> Saving…</>
                            : <><SaveIcon /> Save Layout</>}
                </button>
            </div>

            {activeSection && (
                <SectionSettingsModal
                    section={activeSection}
                    onSave={saveSettings}
                    onClose={() => setActiveSection(null)}
                />
            )}
        </div>
    );
}