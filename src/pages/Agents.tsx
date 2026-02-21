import { useState } from "react";

import "../styles/v2-styles.css";
import Navigation from "../components/v2/Navigation";
import FooterV2 from "../components/v2/FooterV2";
import LipsyncDemoCard from "../components/v2/LipsyncDemoCard";

const THEME_KEY = 'v2-theme';

const Agents = () => {
  const [isLight, setIsLight] = useState<boolean>(() => {
    return localStorage.getItem(THEME_KEY) === 'light';
  });

  const toggleTheme = () => {
    setIsLight(prev => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? 'light' : 'dark');
      return next;
    });
  };

  return (
    <div className={`v2-scope${isLight ? ' v2-light' : ''}`}>
      <Navigation isLight={isLight} onToggleTheme={toggleTheme} />

      <main className="lipsync-page">
        {/* Page header */}
        <section className="lipsync-hero">
          <span className="v2-section-tag">Interactive Demos</span>
          <h1 className="v2-section-title">
            AI Lipsync <span className="accent">Gallery</span>
          </h1>
          <p className="v2-section-sub">
            Real-time AI voices paired with animated avatars. Start a demo to hear the AI speak and watch the mouth sync live.
          </p>
        </section>

        {/* Demo grid */}
        <section className="lipsync-grid-section">
          <div className="lipsync-grid">
            <LipsyncDemoCard
              type="cat"
              title="Cat Avatar"
              description="Cute animated cat with precise Preston Blair viseme mapping across 6 mouth positions. Powered by a real-time voice AI."
            />

            <LipsyncDemoCard
              type="coming-soon"
              title="3D Human Avatar"
              description="Photorealistic 3D head with blend-shape driven lip sync, blinking, and subtle micro-expressions."
              placeholderIcon={<Avatar3DIcon />}
            />

            <LipsyncDemoCard
              type="coming-soon"
              title="Animated Character"
              description="Stylised 2D cartoon character with expressive mouth shapes and hand-crafted animation curves."
              placeholderIcon={<CartoonIcon />}
            />
          </div>
        </section>
      </main>

      <FooterV2 />
    </div>
  );
};

// ── Placeholder icons for coming-soon cards ───────────────────────────────────
const Avatar3DIcon = () => (
  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <path d="M9 14s-1 1-1 3" />
    <path d="M15 14s1 1 1 3" />
  </svg>
);

const CartoonIcon = () => (
  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" />
    <path d="M8 8c.5-1 1.5-1.5 2-1.5" />
    <path d="M16 8c-.5-1-1.5-1.5-2-1.5" />
  </svg>
);

export default Agents;
