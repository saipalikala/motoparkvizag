import { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { adminGet, adminPost, adminPut, adminDelete, adminUpload, API } from "@/config/api";
import { GripVertical } from "lucide-react";
import "./AdminCategories.css";

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const CloseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const ImagePlaceholderIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;

const emptyForm = () => ({
    name: "",
    description: "",
    ctaText: "Explore Collection >",
    displayOrder: 0,
    isActive: true,
    coverImage: null
});

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [panelOpen, setPanelOpen] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [orderSaving, setOrderSaving] = useState(false);

    const fileInputRef = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await adminGet("/categories");
            // The backend is expected to return items sorted by displayOrder
            const cats = data.categories || data || [];
            setCategories(cats);
        } catch (e) {
            console.error(e);
            flash("Error loading categories", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const flash = (text, isError = false) => {
        setMsg(isError ? `❌ ${text}` : `✅ ${text}`);
        setTimeout(() => setMsg(""), 3000);
    };

    const openNew = () => {
        setForm({ ...emptyForm(), displayOrder: categories.length });
        setEditingId(null);
        setImageFile(null);
        setImagePreview(null);
        setPanelOpen(true);
    };

    const openEdit = (cat) => {
        setForm({
            name: cat.name || "",
            description: cat.description || "",
            ctaText: cat.ctaText || "Explore Collection >",
            displayOrder: cat.displayOrder || 0,
            isActive: cat.isActive !== undefined ? cat.isActive : true,
            coverImage: cat.coverImage || cat.image || null
        });
        setEditingId(cat._id);
        setImageFile(null);
        setImagePreview(cat.coverImage || cat.image || null);
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setForm(f => ({ ...f, coverImage: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return flash("Name is required", true);

        setSaving(true);
        try {
            let finalImageUrl = form.coverImage;

            if (imageFile) {
                const fd = new FormData();
                fd.append("media", imageFile);
                const uploadRes = await adminUpload("/upload/media", fd);
                if (uploadRes && uploadRes.url) {
                    finalImageUrl = uploadRes.url;
                }
            }

            const payload = {
                ...form,
                coverImage: finalImageUrl
            };

            if (editingId) {
                await adminPut(`/categories/${editingId}`, payload);
                flash(`"${form.name}" updated`);
            } else {
                await adminPost("/categories", payload);
                flash(`"${form.name}" created`);
            }

            load();
            closePanel();
        } catch (e) {
            flash(e.message || "Error saving category", true);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete "${name}"? Products in this category will lose their category.`)) return;
        try {
            await adminDelete(`/categories/${id}`);
            load();
            flash(`"${name}" deleted`);
        } catch (e) {
            flash("Error deleting", true);
        }
    };

    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        
        const items = Array.from(categories);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        const reordered = items.map((cat, index) => ({ ...cat, displayOrder: index }));
        setCategories(reordered);
        
        setOrderSaving(true);
        try {
            await adminPut("/categories/bulk-order", { categories: reordered });
            flash("Order saved");
        } catch (e) {
            flash("Error saving order", true);
            load(); // Revert back to original order
        } finally {
            setOrderSaving(false);
        }
    };

    return (
        <div className="acat-page">
            {msg && <div className={`acat-flash ${msg.startsWith('❌') ? 'acat-flash-error' : ''}`}>{msg}</div>}

            <div className="acat-header-row">
                <div>
                    <h1 className="acat-page-title">Categories</h1>
                    <p className="acat-page-sub">Manage categories for the store and homepage grid. Drag to reorder.</p>
                </div>
                <button className="acat-btn-primary" onClick={openNew}>
                    <PlusIcon /> Add Category
                </button>
            </div>

            <div className="acat-card">
                {loading ? (
                    <div className="acat-loading">Loading…</div>
                ) : categories.length === 0 ? (
                    <div className="acat-empty">No categories yet. Click "Add Category" to start.</div>
                ) : (
                    <div className="acat-table-wrap">
                        <div className="acat-table-header">
                            <div style={{width: 30}}></div>
                            <div style={{flex: '0 0 60px'}}>Image</div>
                            <div style={{flex: 1}}>Category Details</div>
                            <div style={{flex: '0 0 100px'}}>Status</div>
                            <div style={{flex: '0 0 100px'}}>Actions</div>
                        </div>
                        
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="categories">
                                {(provided) => (
                                    <div 
                                        className="acat-table-body" 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        style={{ opacity: orderSaving ? 0.5 : 1 }}
                                    >
                                        {categories.map((c, index) => {
                                            const imgSrc = c.coverImage || c.image;
                                            const formattedImgSrc = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : `${API}/${imgSrc.replace(/^\//, "")}`) : null;
                                            
                                            return (
                                                <Draggable key={c._id} draggableId={c._id} index={index}>
                                                    {(prov, snap) => (
                                                        <div 
                                                            className={`acat-table-row ${snap.isDragging ? 'is-dragging' : ''}`}
                                                            ref={prov.innerRef}
                                                            {...prov.draggableProps}
                                                            style={{
                                                                ...prov.draggableProps.style,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                padding: '12px',
                                                                borderBottom: '1px solid #2c2c2e',
                                                                background: snap.isDragging ? '#2c2c2e' : 'transparent',
                                                            }}
                                                        >
                                                            <div style={{width: 30, display: 'flex', alignItems: 'center'}} {...prov.dragHandleProps}>
                                                                <GripVertical size={16} color="#8e8e93" style={{cursor: 'grab'}} />
                                                            </div>
                                                            <div style={{flex: '0 0 60px'}}>
                                                                <div className="acat-td-img" style={{width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: '#2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                                    {formattedImgSrc ? <img src={formattedImgSrc} alt={c.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <ImagePlaceholderIcon />}
                                                                </div>
                                                            </div>
                                                            <div style={{flex: 1, paddingRight: 16}}>
                                                                <div className="acat-td-name" style={{fontWeight: 600, color: '#fff'}}>{c.name}</div>
                                                                {c.description && <div className="acat-td-desc" style={{fontSize: 13, color: '#8e8e93', marginTop: 4}}>{c.description}</div>}
                                                            </div>
                                                            <div style={{flex: '0 0 100px'}}>
                                                                {c.isActive !== false ? <span className="acat-badge active">Active</span> : <span className="acat-badge inactive">Hidden</span>}
                                                            </div>
                                                            <div style={{flex: '0 0 100px'}}>
                                                                <div className="acat-actions">
                                                                    <button onClick={() => openEdit(c)} className="acat-btn-icon" title="Edit"><EditIcon /></button>
                                                                    <button onClick={() => handleDelete(c._id, c.name)} className="acat-btn-icon acat-btn-del" title="Delete"><TrashIcon /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                )}
            </div>

            {/* SIDE PANEL */}
            {panelOpen && (
                <>
                    <div className="acat-overlay" onClick={closePanel} />
                    <div className="acat-panel">
                        <div className="acat-panel-header">
                            <h2>{editingId ? "Edit Category" : "New Category"}</h2>
                            <button className="acat-panel-close" onClick={closePanel}><CloseIcon /></button>
                        </div>
                        
                        <form className="acat-form" onSubmit={handleSubmit}>
                            <div className="acat-form-body">
                                
                                <div className="acat-field">
                                    <label>Name *</label>
                                    <input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Premium Helmets" required />
                                </div>

                                <div className="acat-field">
                                    <label>Cover Image (Figma UI)</label>
                                    <p className="acat-help">Recommended 4:5 aspect ratio (e.g. 800x1000px). Used for the homepage grid.</p>
                                    
                                    <div className="acat-img-uploader">
                                        {imagePreview ? (
                                            <div className="acat-img-preview-box">
                                                <img src={imagePreview.startsWith("blob") || imagePreview.startsWith("http") ? imagePreview : `${API}/${imagePreview.replace(/^\//, "")}`} alt="Preview" />
                                                <div className="acat-img-actions">
                                                    <button type="button" onClick={() => fileInputRef.current.click()}>Replace</button>
                                                    <button type="button" className="danger" onClick={removeImage}>Remove</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="acat-img-dropzone" onClick={() => fileInputRef.current.click()}>
                                                <ImagePlaceholderIcon />
                                                <span>Click to upload image</span>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                                    </div>
                                </div>

                                <div className="acat-field">
                                    <label>Subtitle / Description</label>
                                    <p className="acat-help">Appears below the category name in the grid.</p>
                                    <input value={form.description} onChange={e => setF("description", e.target.value)} placeholder="e.g. Ultimate aerodynamic head safety" />
                                </div>

                                <div className="acat-field">
                                    <label>CTA Text</label>
                                    <input value={form.ctaText} onChange={e => setF("ctaText", e.target.value)} placeholder="Explore Collection >" />
                                </div>

                                <div className="acat-row-2">
                                    <div className="acat-field">
                                        <label className="acat-checkbox-label">
                                            <input type="checkbox" checked={form.isActive} onChange={e => setF("isActive", e.target.checked)} />
                                            Active (Show on store)
                                        </label>
                                    </div>
                                </div>

                            </div>

                            <div className="acat-panel-footer">
                                <button type="button" className="acat-btn-cancel" onClick={closePanel}>Cancel</button>
                                <button type="submit" className="acat-btn-primary" disabled={saving}>
                                    {saving ? "Saving..." : "Save Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminCategories;