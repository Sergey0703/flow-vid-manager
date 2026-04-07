"use client";

import { useState } from "react";
import HeroV2Alt from "./HeroV2Alt";
import Chatbot from "./Chatbot";

export default function HeroSection() {
    const [micUnavailable, setMicUnavailable] = useState(false);

    return (
        <>
            <HeroV2Alt
                agentName="aimediaflow-agent-local"
                onMicError={() => setMicUnavailable(true)}
            />
            <Chatbot forceOpen={micUnavailable} />
        </>
    );
}
