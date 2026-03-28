import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Contact.css";

const faqs = [
    {
        q: "Do you offer cash on delivery?",
        a: "Currently, Cash on Delivery (COD) is available only in select areas and for certain products. Please choose the appropriate payment option at checkout based on availability."
    },
    {
        q: "Are payments secure?",
        a: "All transactions are SSL encrypted. We support UPI, cards, net banking and wallets via trusted gateways."
    },
    {
        q: "What is your return policy?",
        a: "We accept returns within 7 days of delivery, provided the items are unused and in their original packaging. Kindly note that return shipping charges will be the responsibility of the customer."
    },
    {
        q: "How long does delivery take?",
        a: "Most orders are delivered within 2–3 business days. Tracking details are sent via SMS and email."
    }
];

/* ─── ICONS ─── */
const MapPinIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);
const ClockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);
const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);
const ChevronDown = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .3s ease", flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);
const ArrowLeft = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);
const SendIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);
const WhatsAppIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

const Contact = () => {
    const navigate = useNavigate();
    const [openFAQ, setOpenFAQ] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <div className="contact-page">

            {/* ── HERO ── */}
            <div className="contact-hero">
                <div className="contact-hero-bg" aria-hidden="true" />
                <div className="contact-hero-content">
                    <button className="contact-back" onClick={() => navigate(-1)}>
                        <ArrowLeft /> Back
                    </button>
                    <p className="contact-eyebrow">Get In Touch</p>
                    <h1 className="contact-title">Contact MotoPark</h1>
                    <p className="contact-desc">Real riders. Real support. We're here to help.</p>
                </div>
            </div>

            <div className="contact-container">

                {/* ── SPLIT: INFO + FORM ── */}
                <div className="contact-split">

                    {/* INFO CARDS */}
                    <div className="contact-info">

                        <div className="info-card">
                            <div className="info-card-icon"><MapPinIcon /></div>
                            <div>
                                <h4>Visit Us</h4>
                                <p>Seethammapeta Main Rd<br />near Swagath Grand Hotel<br />Visakhapatnam – 530016</p>
                                <a
                                    href="https://www.google.com/maps?q=Seethammapeta+Main+Rd+Visakhapatnam"
                                    target="_blank" rel="noreferrer"
                                    className="info-card-link">
                                    View on Maps →
                                </a>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-card-icon"><PhoneIcon /></div>
                            <div>
                                <h4>Call Us</h4>
                                <a href="tel:08328031179" className="info-card-phone">083280 31179</a>
                                <a href="mailto:support@motopark.in" className="info-card-email">
                                    <MailIcon /> support@motopark.in
                                </a>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-card-icon"><ClockIcon /></div>
                            <div>
                                <h4>Store Hours</h4>
                                <div className="info-hours">
                                    <div className="info-hours-row">
                                        <span>Mon – Sat</span>
                                        <span className="info-hours-time">10:00 AM – 9:00 PM</span>
                                    </div>
                                    <div className="info-hours-row">
                                        <span>Sunday</span>
                                        <span className="info-hours-closed">Closed</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* FORM */}
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <h3 className="contact-form-title">Send a Message</h3>
                        <p className="contact-form-sub">We reply within 24 hours</p>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" placeholder="Your name" required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" placeholder="your@email.com" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Subject</label>
                            <input type="text" placeholder="Order issue, product query…" />
                        </div>

                        <div className="form-group">
                            <label>Message</label>
                            <textarea rows="5" placeholder="Tell us how we can help…" required />
                        </div>

                        <button type="submit" className={`contact-submit ${submitted ? "contact-submit--sent" : ""}`}>
                            {submitted ? "Message Sent ✓" : <><SendIcon /> Send Message</>}
                        </button>
                    </form>

                </div>

                {/* ── MAP ── */}
                <div className="contact-map">
                    <div className="contact-map-header">
                        <p className="contact-section-eyebrow">Location</p>
                        <h2 className="contact-section-title">Find Us</h2>
                    </div>
                    <div className="map-wrap">
                        <iframe
                            title="MotoPark Location"
                            src="https://www.google.com/maps?q=Seethammapeta%20Main%20Rd%20Visakhapatnam&output=embed"
                            loading="lazy"
                        />
                    </div>
                </div>

                {/* ── FAQ ── */}
                <div className="contact-faq">
                    <div className="contact-faq-header">
                        <p className="contact-section-eyebrow">FAQ</p>
                        <h2 className="contact-section-title">Common Questions</h2>
                    </div>
                    <div className="faq-list">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className={`faq-item ${openFAQ === i ? "faq-item--open" : ""}`}
                                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && setOpenFAQ(openFAQ === i ? null : i)}
                            >
                                <div className="faq-q">
                                    <span>{faq.q}</span>
                                    <ChevronDown open={openFAQ === i} />
                                </div>
                                {openFAQ === i && (
                                    <div className="faq-a">{faq.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ── WHATSAPP FLOAT ── */}
            <a
                href="https://wa.me/918328031179"
                className="wa-float"
                target="_blank" rel="noreferrer"
                aria-label="Chat on WhatsApp"
            >
                <WhatsAppIcon />
                <span>WhatsApp</span>
            </a>

        </div>
    );
};

export default Contact;