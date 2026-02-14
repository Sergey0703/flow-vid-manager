import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, BookOpen, RefreshCw, X } from "lucide-react";

interface KBEntry {
  id: string;
  category: string;
  text: string;
  status?: "pending" | "indexed";
}

const CATEGORIES = ["about", "services", "process", "pricing", "faq", "contact"];

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
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        <div className="flex gap-2">
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
