import { GripVertical, Settings } from "lucide-react";
import { sectionMeta } from "@/admin/pages/HomeBuilder/sectionMeta";

export default function SectionCard({
    section,
    toggleSection,
    openSettings,
    dragProps
}) {

    const meta = sectionMeta[section.key];

    const Icon = meta?.icon;

    return (

        <div className="section-card">

            <div className="section-left" {...dragProps}>

                <GripVertical size={18} className="drag-handle" />

                {Icon && <Icon size={20} className="section-icon" />}

                <div>

                    <h4>{meta?.title || section.key}</h4>

                    <p className="section-desc">
                        {meta?.description}
                    </p>

                </div>

            </div>

            <div className="section-right">

                <button
                    className="settings-btn"
                    onClick={() => openSettings(section)}
                >
                    <Settings size={16} />
                </button>

                <label className="switch">

                    <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={toggleSection}
                    />

                    <span className="slider"></span>

                </label>

            </div>

        </div>

    );

}