
const FooterV2 = () => {
    return (
        <footer className="v2-footer">
            <div className="v2-container">
                <div className="v2-footer-grid">
                    <div className="v2-footer-brand">
                        <a href="#" className="v2-logo" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                            <span className="ai">AI</span><span className="rest" style={{ color: '#fff' }}>MediaFlow</span>
                        </a>
                        <p>Empowering Irish businesses with intelligent AI solutions that work from day one.</p>
                    </div>

                    <div>
                        <h4>Services</h4>
                        <ul>
                            <li><a href="#services">AI Phone Assistants</a></li>
                            <li><a href="#services">Website Chatbots</a></li>
                            <li><a href="#services">Paperwork Automation</a></li>
                            <li><a href="#services">AI Marketing Videos</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#how">How It Works</a></li>
                            <li><a href="#work">Our Work</a></li>
                            <li><a href="#faq">FAQ</a></li>
                            <li><a href="#contact">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Get in Touch</h4>
                        <div className="footer-contact-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>

                            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                                <div className="v2-footer-icon-wrap">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </div>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <div style={{ color: 'var(--v2-cyan)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>Email</div>
                                    <a href="mailto:auto2025system@gmail.com" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-link">auto2025system@gmail.com</a>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                                <div className="v2-footer-icon-wrap">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.463 3.516z" /></svg>
                                </div>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <div style={{ color: 'var(--v2-cyan)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>WhatsApp</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <a href="https://wa.me/353852007612" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-link">+353 85 2007 612 · Serhii</a>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                                <div className="v2-footer-icon-wrap">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                </div>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <div style={{ color: 'var(--v2-cyan)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>Location</div>
                                    <span style={{ color: 'var(--v2-text)' }}>Kerry, Ireland</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="v2-footer-bottom">
                    <p>© 2025 AIMediaFlow. All rights reserved.</p>
                    <p>Built with intelligent automation · <a href="https://aimediaflow.net" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-link">aimediaflow.net</a></p>
                </div>
            </div>
        </footer>
    );
};

export default FooterV2;
