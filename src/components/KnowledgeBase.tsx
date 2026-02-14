import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, BookOpen, RefreshCw, X, Database } from "lucide-react";

interface KBEntry {
  id: string;
  category: string;
  text: string;
  status?: "pending" | "indexed";
}

const CATEGORIES = ["about", "services", "process", "pricing", "faq", "contact"];

const DEFAULT_KB: Omit<KBEntry, "status">[] = [
  // ABOUT
  { id: "about-1", category: "about", text: "AIMediaFlow is an AI automation agency based in Kerry, Ireland. We help Irish SMEs save time and grow revenue by deploying practical AI solutions that work from day one — no long projects, no fluff, just results." },
  { id: "about-2", category: "about", text: "AIMediaFlow was founded by Serhii, an AI automation specialist. We serve businesses across Ireland remotely and in-person in Kerry. Our approach: understand your pain points first, then build the right solution." },

  // SERVICES — Phone
  { id: "svc-phone-1", category: "services", text: "AI Phone Assistants: 24/7 voice AI that answers your business calls, qualifies leads, books appointments into your calendar, and handles FAQs — without a receptionist. No missed calls, no staff costs." },
  { id: "svc-phone-2", category: "services", text: "Our AI Phone Assistants suit any call-heavy business: trades, clinics, salons, estate agents, solicitors, restaurants. The AI speaks naturally, understands Irish accents, and escalates to a human when needed." },

  // SERVICES — Chatbot
  { id: "svc-chat-1", category: "services", text: "Website Chatbots: AI chatbots trained on your own knowledge base — your products, services, prices, FAQs. They answer customer and staff questions accurately around the clock and capture leads automatically." },
  { id: "svc-chat-2", category: "services", text: "Our chatbots are not generic templates — they are trained specifically on your business content. They know your policies, services, pricing ranges, and can book discovery calls or submit contact forms." },

  // SERVICES — Paperwork
  { id: "svc-paper-1", category: "services", text: "Paperwork Automation: We eliminate manual data entry by building AI that reads documents — invoices, forms, certificates, emails — extracts key information, and pushes it into your systems automatically." },
  { id: "svc-paper-2", category: "services", text: "Paperwork automation examples: property managers automating lease processing, accountants automating invoice extraction, tradespeople automating cert filing. We handle PDFs, images, emails, and scanned documents." },

  // SERVICES — RAG / Doc Management
  { id: "svc-rag-1", category: "services", text: "AI Document Management (RAG): We build systems that let your team ask questions and get instant accurate answers from your own documents and records — like having an AI that knows your entire business." },

  // SERVICES — Video
  { id: "svc-video-1", category: "services", text: "AI Marketing Videos: High-quality video content enhanced with AI — for social media, ads, website pages, and brand storytelling. Fast turnaround at a fraction of traditional agency cost." },

  // ROLE-BASED — Owner/CEO
  { id: "role-ceo-1", category: "services", text: "For business owners and CEOs: AI Phone Assistants free up your team from answering calls. Paperwork automation eliminates manual data entry. Together they can save 10-20 hours per week for a typical SME." },
  { id: "role-ceo-2", category: "services", text: "For owner-operated businesses: AI means you can grow without hiring. A 24/7 AI receptionist handles calls while you sleep. Automated document processing replaces a part-time admin role." },

  // ROLE-BASED — Operations/Admin
  { id: "role-ops-1", category: "services", text: "For operations managers: Our document automation connects to your existing systems (email, CRM, cloud storage). No need to replace software — AI sits on top and handles the repetitive extraction work." },

  // ROLE-BASED — Sales/Marketing
  { id: "role-sales-1", category: "services", text: "For sales and marketing teams: AI chatbots capture leads 24/7 from your website. AI marketing videos let you produce content faster. Every inquiry gets an instant response, even at 2am." },

  // PROCESS
  { id: "proc-1", category: "process", text: "Step 1 — Free Discovery Call (30 min): We learn about your business, your biggest time-wasters, and what tasks are costing you most. No commitment, no sales pitch — just a straight conversation." },
  { id: "proc-2", category: "process", text: "Step 2 — Custom Solution Design: We design a practical AI solution for your specific business — not a template. You approve the plan and expected outcomes before any work starts." },
  { id: "proc-3", category: "process", text: "Step 3 — Build, Deploy, Train: We build and deploy the solution, train your team, and make sure everything works. Ongoing support included. Most projects go live within 1-2 weeks." },

  // PRICING
  { id: "price-1", category: "pricing", text: "Pricing is fully custom — every business is different in size, volume, and complexity. We don't have fixed packages. Book a free discovery call to get an accurate quote for your specific situation." },
  { id: "price-2", category: "pricing", text: "AI Phone Assistant setup typically starts from a few hundred euros with a small monthly fee. Chatbots are similar. Document automation varies by volume and complexity. All pricing is discussed transparently upfront." },
  { id: "price-3", category: "pricing", text: "Most clients see ROI within the first month — either from time saved, leads captured overnight, or admin costs reduced. The free discovery call helps us estimate the ROI for your specific business." },

  // FAQ
  { id: "faq-1", category: "faq", text: "How long does it take? Most projects go live in 1-2 weeks. Simple chatbots can be ready in days. Complex document automation may take 3-4 weeks. We give you a clear timeline before starting." },
  { id: "faq-2", category: "faq", text: "Do I need technical knowledge? No. We handle everything. You describe your business and goals — we build and deploy the solution and train your team on how to use it." },
  { id: "faq-3", category: "faq", text: "Does AI replace my staff? No — AI handles repetitive, time-consuming tasks so your team can focus on work that actually needs a human. We always apply the Human-in-the-Loop principle: AI assists, humans decide." },
  { id: "faq-4", category: "faq", text: "Will it work for an Irish business? Yes — our solutions are built for Irish SMEs. Phone assistants understand Irish accents, work with Irish calendars, and comply with GDPR." },
  { id: "faq-5", category: "faq", text: "What if something breaks? We provide ongoing support. If anything needs fixing or updating — WhatsApp, call, or email us and we respond fast. Support is included in every project." },
  { id: "faq-6", category: "faq", text: "Is my data safe? Yes. All solutions are GDPR-compliant. For businesses requiring maximum privacy (legal, financial, medical), we can deploy On-Premise so data never leaves your own systems." },

  // CONTACT
  { id: "contact-1", category: "contact", text: "Contact AIMediaFlow: Email auto2025system@gmail.com | WhatsApp +353 85 2007 612 (Serhii) | Kerry, Ireland. We respond within a few hours during business hours." },
  { id: "contact-2", category: "contact", text: "Book a free 30-minute discovery call — use the contact form on the website or WhatsApp us at +353 85 2007 612. No obligation, no sales pressure. Just a conversation about your business needs." },
];

const KnowledgeBase = () => {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [formData, setFormData] = useState({ category: "faq", text: "" });
  const { toast } = useToast();

  // Load entries from localStorage (persists between page reloads)
  useEffect(() => {
    const saved = localStorage.getItem("kb_entries");
    if (saved) {
      try { setEntries(JSON.parse(saved)); } catch {}
    }
  }, []);

  const save = (updated: KBEntry[]) => {
    setEntries(updated);
    localStorage.setItem("kb_entries", JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!formData.text.trim()) {
      toast({ title: "Error", description: "Text cannot be empty", variant: "destructive" });
      return;
    }
    const entry: KBEntry = {
      id: `kb-${Date.now()}`,
      category: formData.category,
      text: formData.text.trim(),
      status: "pending",
    };
    save([...entries, entry]);
    setFormData({ category: "faq", text: "" });
    setShowForm(false);
    toast({ title: "Entry added", description: "Click 'Upload to Pinecone' to index it." });
  };

  const handleLoadDefaults = () => {
    const existing = new Set(entries.map(e => e.id));
    const newEntries = DEFAULT_KB
      .filter(e => !existing.has(e.id))
      .map(e => ({ ...e, status: "pending" as const }));
    if (newEntries.length === 0) {
      toast({ title: "Already loaded", description: "Default entries are already in the list." });
      return;
    }
    save([...entries, ...newEntries]);
    toast({ title: `${newEntries.length} entries added`, description: "Click 'Upload to Pinecone' to index them." });
  };

  const handleDelete = (id: string) => {
    save(entries.filter(e => e.id !== id));
    toast({ title: "Entry deleted", variant: "destructive" });
  };

  const handleIngest = async () => {
    const pending = entries.filter(e => e.status === "pending");
    if (pending.length === 0) {
      toast({ title: "Nothing to upload", description: "All entries are already indexed." });
      return;
    }

    setIngesting(true);
    try {
      const ingestSecret = import.meta.env.VITE_INGEST_SECRET as string | undefined;
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(ingestSecret ? { authorization: `Bearer ${ingestSecret}` } : {}),
        },
        body: JSON.stringify({ entries: pending }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ingest failed");
      }

      const { indexed } = await res.json() as { indexed: number };

      // Mark all as indexed
      save(entries.map(e => ({ ...e, status: "indexed" as const })));

      toast({ title: "Uploaded to Pinecone", description: `${indexed} entries indexed successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIngesting(false);
    }
  };

  const pending = entries.filter(e => e.status === "pending").length;
  const indexed = entries.filter(e => e.status === "indexed").length;

  return (
    <div className="space-y-6">
      {/* Stats + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: <strong className="text-foreground">{entries.length}</strong></span>
          <span>Indexed: <strong className="text-green-500">{indexed}</strong></span>
          <span>Pending: <strong className="text-yellow-500">{pending}</strong></span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleLoadDefaults}>
            <Database className="mr-2 h-4 w-4" />
            Load Default KB
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
          <Button
            size="sm"
            onClick={handleIngest}
            disabled={ingesting || pending === 0}
            className="glow-effect"
          >
            {ingesting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {ingesting ? "Uploading..." : `Upload to Pinecone${pending > 0 ? ` (${pending})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Add entry form */}
      {showForm && (
        <Card className="card-gradient glow-effect">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-primary" />
                New Knowledge Base Entry
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Text</Label>
              <Textarea
                value={formData.text}
                onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Write the knowledge base content here..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{formData.text.length} chars</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Add Entry</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      <Card className="card-gradient glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Knowledge Base ({entries.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
              <p className="text-muted-foreground mb-4">
                Add knowledge base entries about your services, FAQs, pricing, and contact info.
                Then upload them to Pinecone to power the chatbot.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                      <Badge
                        variant={entry.status === "indexed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {entry.status === "indexed" ? "indexed" : "pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBase;
