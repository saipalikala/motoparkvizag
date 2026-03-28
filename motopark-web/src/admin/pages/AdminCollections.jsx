import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./AdminCollections.css";

import { API } from "@/config/api";
const COLL_URL = `${API}/collections`;
const PROD_URL = `${API}/products`;
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const SaveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const DragIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="15" cy="5" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" /></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;
const BackIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;

const getImg = (p) => {
    const raw = p.variants?.[0]?.images?.[0] || p.images?.[0];
    return raw ? (raw.startsWith("http") ? raw : `${API}/${raw.replace(/^\//, "")}`) : null;
};

const AdminCollections = () => {
    const [collections, setCollections] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCollection, setActiveCollection] = useState(null);
    const [name, setName] = useState("");
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const loadCollections = async () => {
        const res = await fetch(COLL_URL);
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : []);
    };

    const loadProducts = async () => {
        const res = await fetch(`${PROD_URL}?limit=200`);
        const data = await res.json();
        setProducts(data.products || data || []);
    };

    useEffect(() => { loadCollections(); loadProducts(); }, []);

    /* CREATE */
    const create = async () => {
        if (!name.trim()) return;
        await fetch(COLL_URL, {
            method: "POST",
            headers: AUTH(),
            body: JSON.stringify({ name: name.trim(), slug: name.trim().toLowerCase().replace(/\s+/g, "-") }),
        });
        setName("");
        loadCollections();
    };

    /* DELETE COLLECTION */
    const deleteCollection = async (id) => {
        if (!confirm("Delete this collection?")) return;
        await fetch(`${COLL_URL}/${id}`, { method: "DELETE", headers: AUTH() });
        loadCollections();
    };

    /* TOGGLE PRODUCT */
    const toggleProduct = (product) => {
        const exists = activeCollection.products?.some(p => p._id === product._id);
        const updated = exists
            ? activeCollection.products.filter(p => p._id !== product._id)
            : [...(activeCollection.products || []), product];
        setActiveCollection({ ...activeCollection, products: updated });
    };

    /* DRAG */
    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(activeCollection.products);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        setActiveCollection({ ...activeCollection, products: items });
    };

    /* SAVE */
    const saveCollection = async () => {
        setSaving(true);
        try {
            await fetch(`${COLL_URL}/${activeCollection._id}`, {
                method: "PUT",
                headers: AUTH(),
                body: JSON.stringify({ products: activeCollection.products.map(p => p._id) }),
            });
            setSaved(true);
            setTimeout(() => { setSaved(false); setActiveCollection(null); loadCollections(); }, 1200);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase())
    );

    /* ── EDITOR VIEW ── */
    if (activeCollection) return (
        <div className="ac-page">
            <div className="ac-editor-header">
                <button className="ac-back-btn" onClick={() => setActiveCollection(null)}><BackIcon /> Collections</button>
                <h2 className="ac-editor-title">{activeCollection.name}</h2>
                <span className="ac-selected-count">{activeCollection.products?.length || 0} products selected</span>
            </div>

            <div className="ac-editor-layout">
                {/* PRODUCT PICKER */}
                <div className="ac-picker-panel">
                    <div className="ac-picker-header">
                        <h3>Add Products</h3>
                        <div className="ac-picker-search-wrap">
                            <input className="ac-picker-search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="ac-picker-grid">
                        {filteredProducts.map(product => {
                            const selected = activeCollection.products?.some(p => p._id === product._id);
                            const src = getImg(product);
                            return (
                                <div key={product._id} className={`ac-picker-card ${selected ? "ac-picker-card--selected" : ""}`} onClick={() => toggleProduct(product)}>
                                    <div className="ac-picker-check">{selected && <CheckIcon />}</div>
                                    <div className="ac-picker-img">
                                        {src ? <img src={src} alt={product.name} /> : <div className="ac-picker-img-ph" />}
                                    </div>
                                    <div className="ac-picker-info">
                                        <span className="ac-picker-name">{product.name}</span>
                                        <span className="ac-picker-price">₹{product.price?.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* DRAG ORDER */}
                <div className="ac-order-panel">
                    <h3>Product Order <span>Drag to reorder</span></h3>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="products">
                            {provided => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="ac-order-list">
                                    {(activeCollection.products || []).length === 0 && (
                                        <div className="ac-order-empty">Select products from the left panel</div>
                                    )}
                                    {(activeCollection.products || []).map((product, index) => {
                                        const src = getImg(product);
                                        return (
                                            <Draggable key={product._id} draggableId={product._id} index={index}>
                                                {prov => (
                                                    <div ref={prov.innerRef} {...prov.draggableProps} className="ac-order-item" style={prov.draggableProps.style}>
                                                        <div className="ac-order-drag" {...prov.dragHandleProps}><DragIcon /></div>
                                                        <div className="ac-order-img">
                                                            {src ? <img src={src} alt={product.name} /> : <div className="ac-picker-img-ph" />}
                                                        </div>
                                                        <span className="ac-order-name">{product.name}</span>
                                                        <button className="ac-order-del" onClick={() => toggleProduct(product)}><TrashIcon /></button>
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

                    <div className="ac-save-bar">
                        <button
                            className={`ac-save-btn ${saved ? "ac-save-btn--saved" : ""}`}
                            onClick={saveCollection}
                            disabled={saving}
                        >
                            {saved ? <><CheckIcon />Saved!</> : saving ? "Saving…" : <><SaveIcon />Save Collection</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    /* ── LIST VIEW ── */
    return (
        <div className="ac-page">
            {/* CREATE */}
            <div className="ac-create-card">
                <h2 className="ac-create-title">New Collection</h2>
                <p className="ac-create-sub">Collections are curated groups of products shown on your storefront.</p>
                <div className="ac-create-row">
                    <input className="ac-create-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Best Sellers, Winter Gear" onKeyDown={e => e.key === "Enter" && create()} />
                    <button className="ac-create-btn" onClick={create} disabled={!name.trim()}><PlusIcon /> Create</button>
                </div>
            </div>

            {/* COLLECTION LIST */}
            <div className="ac-list-card">
                <h2 className="ac-list-title">All Collections <span>{collections.length}</span></h2>
                {collections.length === 0 ? (
                    <div className="ac-list-empty">No collections yet</div>
                ) : (
                    <div className="ac-coll-list">
                        {collections.map(col => (
                            <div className="ac-coll-row" key={col._id}>
                                <div className="ac-coll-info">
                                    <span className="ac-coll-name">{col.name}</span>
                                    <span className="ac-coll-count">{col.products?.length || 0} product{col.products?.length !== 1 ? "s" : ""}</span>
                                </div>
                                <div className="ac-coll-actions">
                                    <button className="ac-edit-btn" onClick={() => setActiveCollection(col)}>Edit Products</button>
                                    <button className="ac-del-btn" onClick={() => deleteCollection(col._id)}><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCollections;