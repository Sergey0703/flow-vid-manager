import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";

const Contact = () => {
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', message: '', website: ''
    });
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                setStatus('success');
                setForm({ firstName: '', lastName: '', email: '', phone: '', message: '', website: '' });
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

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
                                    <a href="mailto:info@aimediaflow.net">info@aimediaflow.net</a>
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

                    <form onSubmit={handleSubmit}>
                        <div className="v2-form-row">
                            <div className="v2-form-field">
                                <label>First Name *</label>
                                <input name="firstName" type="text" placeholder="John" required value={form.firstName} onChange={handleChange} />
                            </div>
                            <div className="v2-form-field">
                                <label>Last Name</label>
                                <input name="lastName" type="text" placeholder="Doe" value={form.lastName} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="v2-form-row">
                            <div className="v2-form-field">
                                <label>Email *</label>
                                <input name="email" type="email" placeholder="john@company.com" required value={form.email} onChange={handleChange} />
                            </div>
                            <div className="v2-form-field">
                                <label>Phone</label>
                                <input name="phone" type="tel" placeholder="+1 234..." value={form.phone} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Honeypot — hidden from real users, bots fill it in */}
                        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
                            <input name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
                        </div>

                        <div className="v2-form-field">
                            <label>Project Details *</label>
                            <textarea name="message" rows={4} placeholder="I want to automate my customer support..." required value={form.message} onChange={handleChange}></textarea>
                        </div>

                        <button className="v2-form-submit" disabled={status === 'sending'}>
                            {status === 'sending' ? 'Sending...' : 'Send Message'}
                        </button>

                        {status === 'success' && (
                            <p style={{ textAlign: 'center', color: '#22c55e', marginTop: '1rem', fontWeight: 500 }}>
                                Message sent! We'll be in touch within 24 hours.
                            </p>
                        )}
                        {status === 'error' && (
                            <p style={{ textAlign: 'center', color: '#ef4444', marginTop: '1rem' }}>
                                Something went wrong. Please try again or email us directly.
                            </p>
                        )}

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
