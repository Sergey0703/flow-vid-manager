"""
Run once to create Typesense collections and seed data.
Usage: python setup_typesense.py
Requires: pip install typesense
"""
import typesense

client = typesense.Client({
    "nodes": [{"host": "typesense", "port": "8108", "protocol": "http"}],
    "api_key": "typesense-local-key-2025",
    "connection_timeout_seconds": 10,
})

# ── 1. FAQ collection ────────────────────────────────────────────────────────

FAQ_SCHEMA = {
    "name": "faq",
    "fields": [
        {"name": "id",       "type": "string"},
        {"name": "category", "type": "string", "facet": True},
        {"name": "text",     "type": "string"},
    ],
}

FAQ_DATA = [
    {"id": "about-1",      "category": "about",    "text": "AIMediaFlow is an AI automation agency based in Kerry, Ireland. We help Irish SMEs save time and grow revenue by deploying practical AI solutions that work from day one — no long projects, no fluff, just results."},
    {"id": "about-2",      "category": "about",    "text": "AIMediaFlow was founded by Serhii, an AI automation specialist. We serve businesses across Ireland remotely and in-person in Kerry. Our approach: understand your pain points first, then build the right solution."},
    {"id": "svc-phone-1",  "category": "services", "text": "AI Phone Assistants: 24/7 voice AI that answers your business calls, qualifies leads, books appointments into your calendar, and handles FAQs — without a receptionist. No missed calls, no staff costs."},
    {"id": "svc-phone-2",  "category": "services", "text": "Our AI Phone Assistants suit any call-heavy business: trades, clinics, salons, estate agents, solicitors, restaurants. The AI speaks naturally, understands Irish accents, and escalates to a human when needed."},
    {"id": "svc-chat-1",   "category": "services", "text": "Website Chatbots: AI chatbots trained on your own knowledge base — your products, services, prices, FAQs. They answer customer and staff questions accurately around the clock and capture leads automatically."},
    {"id": "svc-chat-2",   "category": "services", "text": "Our chatbots are not generic templates — they are trained specifically on your business content. They know your policies, services, pricing ranges, and can book discovery calls or submit contact forms."},
    {"id": "svc-paper-1",  "category": "services", "text": "Paperwork Automation: We eliminate manual data entry by building AI that reads documents — invoices, forms, certificates, emails — extracts key information, and pushes it into your systems automatically."},
    {"id": "svc-paper-2",  "category": "services", "text": "Paperwork automation examples: property managers automating lease processing, accountants automating invoice extraction, tradespeople automating cert filing. We handle PDFs, images, emails, and scanned documents."},
    {"id": "svc-rag-1",    "category": "services", "text": "AI Document Management (RAG): We build systems that let your team ask questions and get instant accurate answers from your own documents and records — like having an AI that knows your entire business."},
    {"id": "svc-video-1",  "category": "services", "text": "AI Marketing Videos: High-quality video content enhanced with AI — for social media, ads, website pages, and brand storytelling. Fast turnaround at a fraction of traditional agency cost."},
    {"id": "role-ceo-1",   "category": "services", "text": "For business owners and CEOs: AI Phone Assistants free up your team from answering calls. Paperwork automation eliminates manual data entry. Together they can save 10-20 hours per week for a typical SME."},
    {"id": "role-ceo-2",   "category": "services", "text": "For owner-operated businesses: AI means you can grow without hiring. A 24/7 AI receptionist handles calls while you sleep. Automated document processing replaces a part-time admin role."},
    {"id": "role-ops-1",   "category": "services", "text": "For operations managers: Our document automation connects to your existing systems (email, CRM, cloud storage). No need to replace software — AI sits on top and handles the repetitive extraction work."},
    {"id": "role-sales-1", "category": "services", "text": "For sales and marketing teams: AI chatbots capture leads 24/7 from your website. AI marketing videos let you produce content faster. Every inquiry gets an instant response, even at 2am."},
    {"id": "proc-1",       "category": "process",  "text": "Step 1 — Free Discovery Call (30 min): We learn about your business, your biggest time-wasters, and what tasks are costing you most. No commitment, no sales pitch — just a straight conversation."},
    {"id": "proc-2",       "category": "process",  "text": "Step 2 — Custom Solution Design: We design a practical AI solution for your specific business — not a template. You approve the plan and expected outcomes before any work starts."},
    {"id": "proc-3",       "category": "process",  "text": "Step 3 — Build, Deploy, Train: We build and deploy the solution, train your team, and make sure everything works. Ongoing support included. Most projects go live within 1-2 weeks."},
    {"id": "price-1",      "category": "pricing",  "text": "Pricing is fully custom — every business is different in size, volume, and complexity. We don't have fixed packages. Book a free discovery call to get an accurate quote for your specific situation."},
    {"id": "price-2",      "category": "pricing",  "text": "AI Phone Assistant setup typically starts from a few hundred euros with a small monthly fee. Chatbots are similar. Document automation varies by volume and complexity. All pricing is discussed transparently upfront."},
    {"id": "price-3",      "category": "pricing",  "text": "Most clients see ROI within the first month — either from time saved, leads captured overnight, or admin costs reduced. The free discovery call helps us estimate the ROI for your specific business."},
    {"id": "faq-1",        "category": "faq",      "text": "How long does it take? Most projects go live in 1-2 weeks. Simple chatbots can be ready in days. Complex document automation may take 3-4 weeks. We give you a clear timeline before starting."},
    {"id": "faq-2",        "category": "faq",      "text": "Do I need technical knowledge? No. We handle everything. You describe your business and goals — we build and deploy the solution and train your team on how to use it."},
    {"id": "faq-3",        "category": "faq",      "text": "Does AI replace my staff? No — AI handles repetitive, time-consuming tasks so your team can focus on work that actually needs a human. We always apply the Human-in-the-Loop principle: AI assists, humans decide."},
    {"id": "faq-4",        "category": "faq",      "text": "Will it work for an Irish business? Yes — our solutions are built for Irish SMEs. Phone assistants understand Irish accents, work with Irish calendars, and comply with GDPR."},
    {"id": "faq-5",        "category": "faq",      "text": "What if something breaks? We provide ongoing support. If anything needs fixing or updating — WhatsApp, call, or email us and we respond fast. Support is included in every project."},
    {"id": "faq-6",        "category": "faq",      "text": "Is my data safe? Yes. All solutions are GDPR-compliant. For businesses requiring maximum privacy (legal, financial, medical), we can deploy On-Premise so data never leaves your own systems."},
    {"id": "contact-1",    "category": "contact",  "text": "Contact AIMediaFlow: Email info@aimediaflow.net | WhatsApp +353 85 2007 612 (Serhii) | Kerry, Ireland. We respond within a few hours during business hours."},
    {"id": "contact-2",    "category": "contact",  "text": "Book a free 30-minute discovery call — use the contact form on the website or WhatsApp us at +353 85 2007 612. No obligation, no sales pressure. Just a conversation about your business needs."},
    {"id": "contact-3",    "category": "contact",  "text": "To speak with a real person or manager, contact Serhii directly: WhatsApp +353 85 2007 612 or email info@aimediaflow.net. A human team member responds within a few hours during business hours."},
]

# ── 2. Products collection ───────────────────────────────────────────────────

PRODUCTS_SCHEMA = {
    "name": "products",
    "fields": [
        {"name": "id",          "type": "string"},
        {"name": "name",        "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "category",    "type": "string", "facet": True},
        {"name": "price",       "type": "float"},
        {"name": "currency",    "type": "string"},
        {"name": "stock",       "type": "int32"},
        {"name": "sizes",       "type": "string[]", "optional": True},
        {"name": "colors",      "type": "string[]", "optional": True},
        {"name": "sku",         "type": "string"},
    ],
}

# Demo products — replace with real BigCommerce data via webhook later
PRODUCTS_DATA = [
    {"id": "p001", "sku": "HD-BLK-S",  "name": "Classic Hoodie",         "description": "Comfortable heavyweight cotton hoodie. Perfect for everyday wear. Available in multiple colors.",             "category": "hoodies",    "price": 49.99, "currency": "EUR", "stock": 12, "sizes": ["S","M","L","XL"], "colors": ["black","grey","navy"]},
    {"id": "p002", "sku": "HD-OVR-M",  "name": "Oversized Hoodie",        "description": "Relaxed oversized fit. Soft fleece lining, kangaroo pocket, dropped shoulders.",                           "category": "hoodies",    "price": 54.99, "currency": "EUR", "stock": 8,  "sizes": ["S","M","L","XL","XXL"], "colors": ["black","cream","sage"]},
    {"id": "p003", "sku": "HD-ZIP-L",  "name": "Zip-Up Hoodie",           "description": "Full zip hoodie with front pockets. Lightweight and versatile, great for layering.",                        "category": "hoodies",    "price": 59.99, "currency": "EUR", "stock": 0,  "sizes": ["S","M","L","XL"], "colors": ["black","charcoal"]},
    {"id": "p004", "sku": "SW-CRW-M",  "name": "Essential Sweatshirt",    "description": "Classic crewneck sweatshirt in premium cotton blend. Minimal design, maximum comfort.",                    "category": "sweatshirts", "price": 44.99, "currency": "EUR", "stock": 15, "sizes": ["XS","S","M","L","XL"], "colors": ["white","grey","black","forest green"]},
    {"id": "p005", "sku": "SW-GRP-S",  "name": "Graphic Sweatshirt",      "description": "Bold graphic print sweatshirt. Limited edition. Relaxed fit.",                                             "category": "sweatshirts", "price": 49.99, "currency": "EUR", "stock": 5,  "sizes": ["S","M","L"], "colors": ["black","white"]},
    {"id": "p006", "sku": "TS-BAS-M",  "name": "Basic Tee",               "description": "100% organic cotton t-shirt. Relaxed fit, pre-washed for softness. A wardrobe staple.",                    "category": "tshirts",    "price": 24.99, "currency": "EUR", "stock": 30, "sizes": ["XS","S","M","L","XL","XXL"], "colors": ["white","black","grey","sand","navy"]},
    {"id": "p007", "sku": "TS-OVR-L",  "name": "Oversized Tee",           "description": "Boxy oversized tee in heavy cotton. Dropped shoulders, ribbed collar.",                                    "category": "tshirts",    "price": 29.99, "currency": "EUR", "stock": 18, "sizes": ["S","M","L","XL"], "colors": ["black","white","washed grey"]},
    {"id": "p008", "sku": "TS-GRP-M",  "name": "Graphic Tee",             "description": "Vintage-inspired graphic print. 100% cotton, unisex fit.",                                                "category": "tshirts",    "price": 34.99, "currency": "EUR", "stock": 0,  "sizes": ["S","M","L","XL"], "colors": ["black","white"]},
    {"id": "p009", "sku": "JK-TRK-M",  "name": "Track Jacket",            "description": "Retro-style track jacket with stripe detail. Lightweight, zip-front. Perfect for layering.",              "category": "jackets",    "price": 79.99, "currency": "EUR", "stock": 6,  "sizes": ["S","M","L","XL"], "colors": ["black","navy","burgundy"]},
    {"id": "p010", "sku": "JK-BOB-L",  "name": "Bomber Jacket",           "description": "Classic bomber silhouette in nylon shell. Ribbed cuffs and hem. Satin lining.",                           "category": "jackets",    "price": 99.99, "currency": "EUR", "stock": 4,  "sizes": ["S","M","L","XL"], "colors": ["black","olive"]},
    {"id": "p011", "sku": "CP-DAD-OS", "name": "Dad Cap",                 "description": "Unstructured 6-panel cap with curved brim. Adjustable strap. One size fits most.",                        "category": "accessories", "price": 24.99, "currency": "EUR", "stock": 20, "sizes": ["one size"], "colors": ["black","grey","navy","tan"]},
    {"id": "p012", "sku": "CP-BEN-OS", "name": "Beanie",                  "description": "Ribbed knit beanie in soft acrylic. Cuffed style. Great for cold weather.",                              "category": "accessories", "price": 19.99, "currency": "EUR", "stock": 25, "sizes": ["one size"], "colors": ["black","grey","cream","forest green"]},
    {"id": "p013", "sku": "BG-TOT-OS", "name": "Canvas Tote Bag",         "description": "Heavyweight canvas tote with reinforced handles. Large interior pocket. Fits A4 documents.",              "category": "accessories", "price": 19.99, "currency": "EUR", "stock": 35, "sizes": ["one size"], "colors": ["natural","black"]},
    {"id": "p014", "sku": "SC-RIB-OS", "name": "Ribbed Scarf",            "description": "Chunky ribbed scarf in soft merino blend. Generous length, great drape.",                                "category": "accessories", "price": 29.99, "currency": "EUR", "stock": 10, "sizes": ["one size"], "colors": ["cream","charcoal","camel"]},
    {"id": "p015", "sku": "PT-JOG-M",  "name": "Jogger Pants",            "description": "Relaxed fit joggers in French terry cotton. Elasticated waist, tapered leg, side and back pockets.",     "category": "bottoms",    "price": 49.99, "currency": "EUR", "stock": 9,  "sizes": ["XS","S","M","L","XL"], "colors": ["black","grey","navy"]},
]


def setup():
    # Drop and recreate collections
    for name in ["faq", "products"]:
        try:
            client.collections[name].delete()
            print(f"Dropped existing collection: {name}")
        except Exception:
            pass

    # Create FAQ
    client.collections.create(FAQ_SCHEMA)
    print("Created collection: faq")
    client.collections["faq"].documents.import_(FAQ_DATA, {"action": "upsert"})
    print(f"Seeded {len(FAQ_DATA)} FAQ entries")

    # Create Products
    client.collections.create(PRODUCTS_SCHEMA)
    print("Created collection: products")
    client.collections["products"].documents.import_(PRODUCTS_DATA, {"action": "upsert"})
    print(f"Seeded {len(PRODUCTS_DATA)} products")

    print("\nTypesense setup complete!")
    print("FAQ entries:", len(FAQ_DATA))
    print("Products:", len(PRODUCTS_DATA))


if __name__ == "__main__":
    setup()
