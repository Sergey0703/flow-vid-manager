
import { Mail, Phone, MapPin } from "lucide-react";

const Contact = () => {
    return (
        <section className="v2-contact" id="contact">
            <div className="v2-contact-inner">

                {/* Left: Info */}
                <div style={{ animation: "fade-up 0.6s ease both" }}>
                    <span className="v2-section-tag">Let's Talk</span>
                    <h2 className="v2-section-title">
                        Start Your<br /><span className="accent">AI Journey Today</span>
                    </h2>
                    <p className="v2-section-sub">
                        Book a free 30-minute discovery call. No jargon, no pressure —
                        just an honest conversation about what AI can do for your business.
                    </p>
                    <p className="v2-contact-promise">
                        <span className="dot"></span>
                        We respond to every message within 24 hours
                    </p>

                    <div className="v2-contact-cards">
                        {/* Email Card */}
                        <div className="v2-contact-card">
                            <div className="v2-contact-card-icon">
                                <Mail size={18} />
                            </div>
                            <div>
                                <div className="v2-contact-card-label">Email</div>
                                <div className="v2-contact-card-value">
                                    <a href="mailto:auto2025system@gmail.com">auto2025system@gmail.com</a>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Card */}
                        <div className="v2-contact-card">
                            <div className="v2-contact-card-icon">
                                <Phone size={18} />
                            </div>
                            <div>
                                <div className="v2-contact-card-label">WhatsApp</div>
                                <div className="v2-contact-card-value">
                                    <a href="https://wa.me/353852007612">+353 85 2007 612</a>
                                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--v2-muted)', fontWeight: 'normal' }}>Serhii Baliashnyi — Sales & Projects</span>
                                </div>
                            </div>
                        </div>

                        {/* Location Card */}
                        <div className="v2-contact-card">
                            <div className="v2-contact-card-icon">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <div className="v2-contact-card-label">Location</div>
                                <div className="v2-contact-card-value">Kerry, Ireland</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="v2-contact-form">
                    <h3>Tell us about your project</h3>
                    <p className="form-sub">Fill in the form and we'll be in touch within one business day.</p>

                    <form onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                        <div className="v2-form-row">
                            <div className="v2-form-field">
                                <label>First Name *</label>
                                <input type="text" placeholder="John" required />
                            </div>
                            <div className="v2-form-field">
                                <label>Last Name</label>
                                <input type="text" placeholder="Doe" />
                            </div>
                        </div>

                        <div className="v2-form-row">
                            <div className="v2-form-field">
                                <label>Email *</label>
                                <input type="email" placeholder="john@company.com" required />
                            </div>
                            <div className="v2-form-field">
                                <label>Phone</label>
                                <input type="tel" placeholder="+1 234..." />
                            </div>
                        </div>

                        <div className="v2-form-field">
                            <label>Project Details *</label>
                            <textarea rows={4} placeholder="I want to automate my customer support..." required></textarea>
                        </div>

                        <button className="v2-form-submit">
                            Send Message
                        </button>

                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--v2-subtle)', marginTop: '1rem' }}>
                            Your info is safe. We never spam.
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Contact;
