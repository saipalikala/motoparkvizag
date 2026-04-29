import "./BrandShowcase.css";

const brands = [
  "/brands/66BHP.png",
  "/brands/Axor.png",
  "/brands/BMC.png",
  "/brands/Kodra.png",
  "/brands/LIUHG.png",
  "/brands/MotoTorque.png",
  "/brands/NGK.png",
  "/brands/REDROOSTER.jpg",
  "/brands/shad.png",
  "/brands/SMK.png",
  "/brands/VIATERRA.png",
];

const BrandShowcase = () => (
    <section className="brands-section">
        <div className="brands-container">

            <header className="brands-header">
                <p className="brands-eyebrow">Partners</p>
                <h2 className="brands-title">Trusted Brands</h2>
                <p className="brands-subtitle">
                    We partner with the world's best riding gear manufacturers
                </p>
            </header>

            {/* MARQUEE TRACK */}
            <div className="brands-slider">

                {/* fade edges */}
                <div className="brands-fade brands-fade--left" aria-hidden="true" />
                <div className="brands-fade brands-fade--right" aria-hidden="true" />

                <div className="brands-track" aria-label="Brand logos">
                    {[...brands, ...brands].map((logo, i) => (
                        <div className="brands-logo" key={i}>
                            <img src={logo} alt="brand logo" />
                        </div>
                    ))}
                </div>

            </div>

        </div>
    </section>
);

export default BrandShowcase;