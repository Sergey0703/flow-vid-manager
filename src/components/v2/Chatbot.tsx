import { useState, useEffect, useRef } from 'react';

const REPLIES: Record<string, string> = {
    'AI Phone System': 'Our AI phone agent answers calls 24/7 — qualifying callers, handling FAQs, and booking appointments directly into your calendar. No missed calls, no receptionists needed. Want to see a demo?',
    'Business Assistant': 'We build custom AI assistants trained on your own business knowledge — products, processes, FAQs. They answer staff and customer questions accurately, around the clock. Interested?',
    'Document Automation': 'We automate document handling end-to-end — from extracting data from paper to organising sales files to building RAG systems for instant AI-powered answers from your own records.',
    'AI Sales Docs': 'Our AI Sales Document Management System automatically categorises and retrieves your sales documents so your team spends less time searching and more time closing deals.',
    'Pricing': 'We offer fully custom pricing based on your specific needs and scale. The best first step is a free 30-minute discovery call — no commitment, just an honest conversation.',
    'Book a Call': 'Great! You can book your free discovery call right now — scroll up and hit the "Book Free Call" button, or fill in the contact form below. We respond within 24 hours.',
};

const INITIAL_QUICK_REPLIES = ['AI Phone System', 'Business Assistant', 'Document Automation', 'AI Sales Docs', 'Pricing', 'Book a Call'];

interface Message {
    text: string;
    sender: 'bot' | 'user';
    time: string;
}

const Chatbot = () => {
    console.log("Chatbot mounting...");
    const [isOpen, setIsOpen] = useState(false);
    const [showTeaser, setShowTeaser] = useState(false);
    const [teaserDismissed, setTeaserDismissed] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [currentQuickReplies, setCurrentQuickReplies] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const addMessage = (text: string, sender: 'bot' | 'user') => {
        setMessages(prev => [...prev, { text, sender, time: now() }]);
    };

    const botReply = (text: string, delay = 1000) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            addMessage(text, 'bot');
        }, delay);
    };

    const handleSend = () => {
        const text = inputValue.trim();
        if (!text) return;

        addMessage(text, 'user');
        setInputValue('');
        setCurrentQuickReplies([]);

        // Default bot response for free text
        botReply("Thanks for reaching out! A member of our team will get back to you within 24 hours. Or book a free discovery call right now — just click the button above.", 1200);

        setTimeout(() => {
            setCurrentQuickReplies(['Book a Call']);
        }, 2400);
    };

    const handleQuickReply = (label: string) => {
        addMessage(label, 'user');
        setCurrentQuickReplies([]);

        const response = REPLIES[label] || "Thanks for your message! Our team will follow up shortly.";
        botReply(response);

        if (label !== 'Book a Call' && label !== 'Pricing') {
            setTimeout(() => {
                setCurrentQuickReplies(['Book a Call', 'Pricing']);
            }, 1800);
        }
    };

    const toggleChat = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        setShowTeaser(false); // Hide teaser when interacting

        if (newState && messages.length === 0) {
            // Initial greeting
            setTimeout(() => addMessage("Hi there! I'm the <strong>AIMediaFlow</strong> assistant.", 'bot'), 300);
            setTimeout(() => addMessage("What can I help you with today?", 'bot'), 900);
            setTimeout(() => setCurrentQuickReplies(INITIAL_QUICK_REPLIES), 1200);
        }
    };

    // Auto-show teaser
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isOpen && !teaserDismissed) {
                setShowTeaser(true);
            }
        }, 4000);
        return () => clearTimeout(timer);
    }, [isOpen, teaserDismissed]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

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

            {/* Bubble Button */}
            <button
                id="chat-bubble"
                className={isOpen ? 'open' : ''}
                onClick={toggleChat}
                aria-label={isOpen ? "Close chat" : "Open chat"}
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
                <div className="chat-head">
                    <div className="chat-avatar">AI</div>
                    <div className="chat-head-info">
                        <div className="chat-head-name">AIMediaFlow Assistant</div>
                        <div className="chat-head-status">Online now</div>
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`msg ${msg.sender}`}>
                            <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: msg.text }} />
                            <div className="msg-time">{msg.time}</div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-quick">
                    {currentQuickReplies.map(label => (
                        <button key={label} className="qr-btn" onClick={() => handleQuickReply(label)}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="chat-input-row">
                    <input
                        type="text"
                        id="chat-input"
                        placeholder="Type a message…"
                        autoComplete="off"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button id="chat-send" onClick={handleSend} aria-label="Send">
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
