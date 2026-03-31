// src/components/Skeleton/Skeleton.jsx
import "./Skeleton.css";

export const SkeletonCard = () => (
    <div className="sk-card">
        <div className="sk-img sk-shine" />
        <div className="sk-line sk-shine" style={{ width: "70%", marginTop: 12 }} />
        <div className="sk-line sk-shine" style={{ width: "40%", marginTop: 8 }} />
        <div className="sk-line sk-shine" style={{ width: "30%", marginTop: 8 }} />
    </div>
);

export const SkeletonGrid = ({ count = 12 }) => (
    <div className="sk-grid">
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
);

export const SkeletonBanner = () => (
    <div className="sk-banner sk-shine" />
);