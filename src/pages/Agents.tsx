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
              agentName="aimediaflow-cat-agent"
            />

            <LipsyncDemoCard
              type="girl"
              title="Girl Avatar"
              description="Animated girl with precise Preston Blair viseme mapping across 6 mouth positions. Powered by a real-time voice AI."
              agentName="aimediaflow-agent-local"
            />

            <LipsyncDemoCard
              type="cat"
              title="Sales Manager"
              description="AI sales assistant that searches a live product catalogue and helps customers find exactly what they need."
              agentName="aimediaflow-salesmanager"
            />

            <LipsyncDemoCard
              type="cat"
              title="Pixel"
              description="AI coordinator that manages requests, routes tasks, and helps orchestrate complex workflows across multiple systems."
              agentName="aimediaflow-coordinator"
            />

            <LipsyncDemoCard
              type="girl"
              title="Secretary"
              description="AI secretary powered by Piper TTS — ultra-fast responses with a natural British voice. Ask about AIMediaFlow services."
              agentName="aimediaflow-secretary"
            />
          </div>
        </section>
      </main>

      <FooterV2 />
    </div>
  );
};

export default Agents;
