
import { useState, useEffect } from "react";

const Navigation = () => {
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

                    <div className="v2-nav-cta">
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
