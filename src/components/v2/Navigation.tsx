
import { useState, useEffect } from "react";

interface NavigationProps {
    isLight: boolean;
    onToggleTheme: () => void;
}

const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
);

const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
);

const Navigation = ({ isLight, onToggleTheme }: NavigationProps) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    return (
        <>
            <header className={`v2-header ${scrolled ? 'scrolled' : ''}`}>
                <nav className="v2-nav">
                    <a href="#" className="v2-logo"><span className="ai">AI</span><span className="rest">MediaFlow</span></a>

                    <ul className="v2-nav-links">
                        <li><a href="#services">Services</a></li>
                        <li><a href="#work">Our Work</a></li>
                        <li><a href="#how">How It Works</a></li>
                        <li><a href="#faq">FAQ</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>

                    <div className="v2-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            className="v2-theme-toggle"
                            onClick={onToggleTheme}
                            title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
                            aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
                        >
                            {isLight ? <MoonIcon /> : <SunIcon />}
                        </button>
                        <a href="#contact" className="v2-btn v2-btn-primary">Book a Demo</a>
                    </div>

                    <div className="v2-hamburger" onClick={toggleMobileMenu}>
                        <span></span><span></span><span></span>
                    </div>
                </nav>
            </header>

            <nav className={`v2-mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
                <a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a>
                <a href="#work" onClick={() => setMobileMenuOpen(false)}>Our Work</a>
                <a href="#how" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
                <a href="#contact" className="v2-btn v2-btn-primary" style={{ textAlign: 'center' }} onClick={() => setMobileMenuOpen(false)}>Book a Demo</a>
            </nav>
        </>
    );
};

export default Navigation;
