import { Link } from "react-router-dom";
import { Instagram, Facebook, Youtube, Phone, Mail, MapPin } from "lucide-react";
import "./Footer.css";

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">

            {/* ── TOP ACCENT ── */}
            <div className="footer-accent" aria-hidden="true" />

            <div className="footer-inner">

                {/* ── BRAND COL ── */}
                <div className="footer-brand">
                    <div className="footer-logo-wrap">
                        <span className="footer-logo-name">Moto Park</span>
                        <span className="footer-logo-sub">Est. 2020</span>
                    </div>
                    <p className="footer-brand-desc">
                        Premium motorcycle gear curated for riders who value
                        performance, safety, and timeless design.
                    </p>

                    {/* SOCIAL */}
                    <div className="footer-social">
                        <a href="https://www.instagram.com/motopark_official?igsh=OWcyZHpsamFvMXZ6"
                            className="footer-social-btn" aria-label="Instagram">
                            <Instagram size={16} />
                        </a>
                        <a href="https://youtube.com" target="_blank" rel="noreferrer"
                            className="footer-social-btn" aria-label="YouTube">
                            <Youtube size={16} />
                        </a>
                        <a href="https://facebook.com" target="_blank" rel="noreferrer"
                            className="footer-social-btn" aria-label="Facebook">
                            <Facebook size={16} />
                        </a>
                    </div>
                </div>

                {/* ── STORE COL ── */}
                <div className="footer-col">
                    <h4 className="footer-col-title">Visit Our Store</h4>

                    <div className="footer-address">
                        <MapPin size={14} className="footer-address-icon" />
                        <p>
                            Seethammapeta Main Rd<br />
                            near Swagath Grand Hotel<br />
                            Visakhapatnam – 530016
                        </p>
                    </div>

                    <a
                        href="https://www.google.com/maps?q=Seethammapeta+Main+Rd+Visakhapatnam"
                        target="_blank" rel="noreferrer"
                        className="footer-map-link"
                    >
                        View on Google Maps
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
                                stroke="currentColor" strokeWidth="1.7"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                </div>

                {/* ── SUPPORT COL ── */}
                <div className="footer-col">
                    <h4 className="footer-col-title">Support</h4>

                    <nav className="footer-links">
                        <Link to="/contact" className="footer-link">Contact Us</Link>
                        <Link to="/about" className="footer-link">About MotoPark</Link>
                        <Link to="/store" className="footer-link">Explore Store</Link>
                    </nav>

                    <div className="footer-contact-list">
                        <a href="mailto:support@motopark.in" className="footer-contact-item">
                            <Mail size={13} />
                            support@motopark.in
                        </a>
                        <a href="tel:08328031179" className="footer-contact-item">
                            <Phone size={13} />
                            083280 31179
                        </a>
                    </div>
                </div>

                {/* ── NEWSLETTER COL ── */}
                <div className="footer-col">
                    <h4 className="footer-col-title">Stay Updated</h4>
                    <p className="footer-newsletter-desc">
                        Get exclusive deals, new arrivals and riding tips.
                    </p>

                    <form className="footer-newsletter" onSubmit={(e) => e.preventDefault()}>
                        <input type="email" placeholder="Your email address" required />
                        <button type="submit">Subscribe</button>
                    </form>

                    {/* PAYMENT METHODS */}
                    <div className="footer-payment">
                        <p className="footer-payment-label">Accepted payments</p>
                        <div className="footer-payment-icons">
                            <img src="/payments/visa.png" alt="Visa" />
                            <img src="/payments/mastercard.png" alt="Mastercard" />
                            <img src="/payments/upi.png" alt="UPI" />
                        </div>
                    </div>
                </div>

            </div>

            {/* ── DIVIDER ── */}
            <div className="footer-divider" />

            {/* ── BOTTOM BAR ── */}
            <div className="footer-bottom">
                <p className="footer-copy">
                    © {year} MotoPark. All rights reserved.
                </p>
                <div className="footer-bottom-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">Returns</a>
                </div>
            </div>

        </footer>
    );
};

export default Footer;