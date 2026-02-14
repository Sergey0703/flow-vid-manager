import { useState, useEffect, useRef } from 'react';

const INITIAL_QUICK_REPLIES = ['AI Phone System', 'Business Assistant', 'Document Automation', 'Pricing', 'Book a Call'];

type SphereState = 'idle' | 'thinking' | 'speaking';

interface Message {
    text: string;
    sender: 'bot' | 'user';
    time: string;
}

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showTeaser, setShowTeaser] = useState(false);
    const [teaserDismissed, setTeaserDismissed] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [sphereState, setSphereState] = useState<SphereState>('idle');
    const [currentQuickReplies, setCurrentQuickReplies] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const sendToAI = async (userText: string, history: Message[]) => {
        setIsTyping(true);
        setSphereState('thinking');
        setCurrentQuickReplies([]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, history }),
            });

            const data = await res.json();
            const reply: string = res.ok && data.reply
                ? data.reply
                : "Thanks for your message! Our team will get back to you within 24 hours. You can also book a free discovery call using the form below.";

            setIsTyping(false);
            setSphereState('speaking');
            setMessages(prev => [...prev, { text: reply, sender: 'bot', time: now() }]);

            // After "speaking" — back to idle and show follow-up quick replies
            setTimeout(() => {
                setSphereState('idle');
                setCurrentQuickReplies(['Book a Call', 'Ask another question']);
            }, Math.min(500 + reply.length * 20, 3000));

        } catch {
            setIsTyping(false);
            setSphereState('idle');
            setMessages(prev => [...prev, {
                text: "Something went wrong on my end. Please try again or email us at auto2025system@gmail.com",
                sender: 'bot',
                time: now()
            }]);
        }
    };

    const handleSend = () => {
        const text = inputValue.trim();
        if (!text || isTyping) return;

        const newMsg: Message = { text, sender: 'user', time: now() };
        setMessages(prev => {
            const updated = [...prev, newMsg];
            sendToAI(text, prev); // pass history before this message
            return updated;
        });
        setInputValue('');
    };

    const handleQuickReply = (label: string) => {
        if (label === 'Ask another question') {
            setCurrentQuickReplies(INITIAL_QUICK_REPLIES);
            return;
        }

        const newMsg: Message = { text: label, sender: 'user', time: now() };
        setMessages(prev => {
            const updated = [...prev, newMsg];
            sendToAI(label, prev);
            return updated;
        });
        setCurrentQuickReplies([]);
    };

    const toggleChat = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        setShowTeaser(false);

        if (newState && messages.length === 0) {
            setTimeout(() => {
                setMessages([{ text: "Hi! I'm the AIMediaFlow assistant. How can I help you today?", sender: 'bot', time: now() }]);
                setSphereState('speaking');
            }, 300);
            setTimeout(() => {
                setSphereState('idle');
                setCurrentQuickReplies(INITIAL_QUICK_REPLIES);
            }, 1400);
        }
    };

    // Auto-show teaser after 4s
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isOpen && !teaserDismissed) setShowTeaser(true);
        }, 4000);
        return () => clearTimeout(timer);
    }, [isOpen, teaserDismissed]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const sphereClass = `chatbot-sphere${sphereState !== 'idle' ? ` ${sphereState}` : ''}`;
    const miniSphereClass = `chatbot-mini-sphere${sphereState !== 'idle' ? ` ${sphereState}` : ''}`;
    const sphereLabelClass = `chatbot-sphere-label${sphereState !== 'idle' ? ` ${sphereState}` : ''}`;
    const sphereLabels: Record<SphereState, string> = { idle: 'listening', thinking: 'processing', speaking: 'responding' };

    return (
        <>
            {/* Teaser */}
            <div id="chat-teaser" className={showTeaser ? 'visible' : 'hidden'}>
                <p className="teaser-text">
                    <strong>Got questions?</strong><br />
                    Chat with our AI assistant — we reply instantly.
                </p>
                <div className="teaser-actions">
                    <button className="teaser-yes" onClick={toggleChat}>Let's chat →</button>
                    <button className="teaser-dismiss" onClick={() => { setShowTeaser(false); setTeaserDismissed(true); }}>Not now</button>
                </div>
            </div>

            {/* Bubble */}
            <button
                id="chat-bubble"
                className={isOpen ? 'open' : ''}
                onClick={toggleChat}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                {!isOpen && messages.length === 0 && <span className="chat-badge">1</span>}
                <svg className="v2-icon-chat" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <svg className="v2-icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                </svg>
            </button>

            {/* Chat Window */}
            <div id="chat-window" className={isOpen ? 'open' : ''} role="dialog" aria-label="AIMediaFlow chat">

                {/* Header with AI sphere */}
                <div className="chat-head">
                    <div className="chatbot-sphere-scene">
                        <div className="chatbot-sphere-ring" />
                        <div className="chatbot-sphere-ring" />
                        <div className={sphereClass} />
                    </div>
                    <div className="chat-head-info">
                        <div className="chat-head-name">AIMediaFlow Assistant</div>
                        <div className={sphereLabelClass}>
                            <span className="chatbot-sphere-dot" />
                            {sphereLabels[sphereState]}
                        </div>
                    </div>
                    <div className={miniSphereClass} style={{ marginLeft: 'auto' }} />
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`msg ${msg.sender}`}>
                            <div className="msg-bubble">{msg.text}</div>
                            <div className="msg-time">{msg.time}</div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="typing-indicator">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                {currentQuickReplies.length > 0 && (
                    <div className="chat-quick">
                        {currentQuickReplies.map(label => (
                            <button key={label} className="qr-btn" onClick={() => handleQuickReply(label)}>
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <div className="chat-input-row">
                    <input
                        type="text"
                        id="chat-input"
                        placeholder="Type a message…"
                        autoComplete="off"
                        value={inputValue}
                        disabled={isTyping}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button id="chat-send" onClick={handleSend} disabled={isTyping} aria-label="Send">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Chatbot;
