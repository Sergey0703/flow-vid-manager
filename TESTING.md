# Pixel Sales Agent — Testing Guide

## Overview

Two testing modes are available:
1. **Text mode** (headless) — tests LLM logic, tool calls, and UI state without voice
2. **Voice mode** (planned) — tests full pipeline including STT and TTS via LiveKit

---

## Mode 1: Headless Text Testing

### What it tests
- LLM understands user intent correctly
- Correct tool is called (`search_products`, `expand_product`, `close_product`, `search_faq`)
- Correct parameters passed to tools (category, colors, sizes, price_max, keywords)
- UI state changes (`recommended_ids`, `expanded_id`) are set correctly
- Agent replies stay within word limits and stay on-topic

### What it does NOT test
- STT accuracy (Parakeet)
- TTS output (Piper/Ryan)
- LiveKit connection and audio latency
- VAD (Voice Activity Detection) and turn detection

### Files

| File | Purpose |
|------|---------|
| `agent-salesmanager/test_agent.py` | Test runner script |
| `agent-salesmanager/test_scenarios.json` | Scenario definitions (editable) |
| `agent-salesmanager/test_results.log` | Last run output (auto-generated) |

### Running tests

Tests run **inside the Docker container** on the server (required — Typesense hostname `typesense` only resolves inside the Docker network).

```bash
# SSH into server and run via docker exec:
ssh -i .ssh_hetzner_key root@46.62.246.93

# List all available scenarios
docker exec aimediaflow-salesmanager python3 /app/test_agent.py --list

# Run a single scenario (fast, no pauses)
docker exec aimediaflow-salesmanager python3 /app/test_agent.py --scenario hoodie_browse --no-pause

# Run all 10 scenarios (fast)
docker exec aimediaflow-salesmanager python3 /app/test_agent.py --no-pause

# Run all scenarios with realistic voice pauses
docker exec aimediaflow-salesmanager python3 /app/test_agent.py
```

### Deploying updated test files to server

```bash
# From project root:
scp -i .ssh_hetzner_key agent-salesmanager/test_agent.py agent-salesmanager/test_scenarios.json root@46.62.246.93:/tmp/
ssh -i .ssh_hetzner_key root@46.62.246.93 "docker cp /tmp/test_agent.py aimediaflow-salesmanager:/app/ && docker cp /tmp/test_scenarios.json aimediaflow-salesmanager:/app/"
```

### Deploying updated agent.py (after code changes)

```bash
scp -i .ssh_hetzner_key agent-salesmanager/agent.py root@46.62.246.93:/opt/aimediaflow-salesmanager/
ssh -i .ssh_hetzner_key root@46.62.246.93 "
  docker stop aimediaflow-salesmanager && docker rm aimediaflow-salesmanager
  docker build --no-cache -t aimediaflow-salesmanager /opt/aimediaflow-salesmanager/
  docker run -d --name aimediaflow-salesmanager --env-file /opt/aimediaflow-salesmanager/.env --network n8n_default --restart unless-stopped aimediaflow-salesmanager
"
# Then copy test files back into the new container
```

### Timing settings (test_scenarios.json)

```json
"settings": {
  "pause_between_messages_sec": 3.5,
  "pause_after_tool_call_sec": 1.5,
  "pause_between_scenarios_sec": 5.0
}
```

These simulate realistic voice conversation pacing. Use `--no-pause` to skip for fast CI-style runs.

### Reading the output

```
[You #3]: close it, open the Oversized Tee
  → TOOL: close_product()               ← tool called (good)
  → UI: expanded: CLOSED                ← expanded_id set to "" (good)
  → TOOL: expand_product(product_id='p007')
  → UI: recommended: [p007] | expanded: p007
[Pixel]: The Oversized Tee is €29.99...
  UI state: recommended=[p007] | expanded=p007
```

- `→ TOOL:` — which tool was called and with what args
- `→ UI:` — what set_attributes would send to the frontend
- `→ no tool call` — LLM answered from context (expected for follow-up questions)
- `UI state:` — cumulative state after all tool calls in this turn

### Scenarios (13 total)

| ID | Persona | Key checks |
|----|---------|------------|
| `hoodie_browse` | Browsing hoodies | category filter, expand, close |
| `out_of_stock_handling` | Out-of-stock items | stock=0 handling, named search with category |
| `price_filter` | Budget shopper <€25 | price_max filter, close between items |
| `jacket_detail` | Comparing jackets | two products, close+open in same message |
| `size_specific` | Needs XXL | size filter, honest "no XXL" response |
| `accessories_full` | Browsing accessories one by one | rapid expand/close cycle |
| `color_hunt` | Looking for specific colors | color filter across categories |
| `gift_shopping` | Buying a gift | neutral colors, size S, price limit |
| `faq_and_shop` | Policy questions then shopping | search_faq → search_products transition |
| `expand_close_stress` | Rapid open/close stress test | 12 messages, multiple expand/close cycles |
| `cart_add_read` | Adding items and checking cart | `add_to_cart`, `read_cart`, total sum |
| `cart_remove` | Add then remove items | `add_to_cart`, `remove_from_cart`, `read_cart` |
| `cart_full_flow` | Full browse→expand→add→remove flow | all cart tools combined with product tools |

### Cart tool output in text mode

Text mode simulates cart state via a local dict (no real LiveKit frontend). What to look for:

```
[You #2]: add the Classic Hoodie to my cart
  → TOOL: add_to_cart(product_id='p001', qty=1)    ← correct tool called
  → CART: added p001 qty=1 | cart=[p001 x1]        ← cart state updated
[Pixel]: Added! You now have 1 item in your cart.

[You #3]: what's in my cart?
  → TOOL: read_cart()
  → CART READ: [p001 x1]
[Pixel]: You have the Classic Hoodie in your cart. Total is €49.99.

[You #5]: remove the hoodie
  → TOOL: remove_from_cart(product_id='p001')
  → CART: removed p001 | cart=[]
[Pixel]: Done, it's out of your cart.
```

Key checks:
- `→ TOOL: add_to_cart(...)` — correct product_id passed (not the name)
- `→ TOOL: read_cart()` — called on "what's in my cart", "total", "basket"
- `→ TOOL: remove_from_cart(...)` — correct id, not just any product
- Agent's spoken reply matches cart state (e.g. correct total)

### Adding new scenarios

Edit `agent-salesmanager/test_scenarios.json` and add to the `scenarios` array:

```json
{
  "id": "my_new_scenario",
  "persona": "Description of customer type",
  "messages": [
    "first message",
    "second message",
    "bye"
  ]
}
```

Then deploy to container:
```bash
scp -i .ssh_hetzner_key agent-salesmanager/test_scenarios.json root@46.62.246.93:/tmp/
ssh -i .ssh_hetzner_key root@46.62.246.93 "docker cp /tmp/test_scenarios.json aimediaflow-salesmanager:/app/"
```

### Known limitations of text mode

- LLM occasionally hallucinates a category name (e.g. `sweatshits` typo) — rare, not a code bug
- Category `clothing` is not a valid Typesense category — agent handles it gracefully but returns no results
- FAQ collection contains AIMediaFlow agency data, not shop policies — agent improvises shipping/returns answers

### Groq API limits

- **Free tier**: 500K tokens/day (~100 conversations)
- **Developer tier**: Pay-per-token, ~$0.11/1M tokens input — set a monthly spend limit at console.groq.com/settings/billing → Spend Limits
- Model: `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Mode 2: Voice Testing via LiveKit

### Concept

A test script connects to a LiveKit room as a "virtual user", generates speech from `test_scenarios.json` messages using Piper TTS, streams the audio to the agent, and monitors `set_attributes` events for UI state changes. This tests the full pipeline:

```
Piper TTS (generates question audio at 22050Hz)
  → resample to 48000Hz
    → LiveKit AudioSource → LocalAudioTrack (mic)
      → Agent STT (Parakeet) — real transcription
        → Agent LLM (Groq / llama-4-scout) — real tool calls
          → set_attributes → ParticipantAttributesChanged event → UI state logged
            → Agent TTS (Piper/Ryan) — real audio reply
```

### What voice mode adds over text mode

- **STT accuracy** — does Parakeet correctly transcribe the synthesised questions?
- **Turn detection** — does agent wait for the full question before responding?
- **End-to-end latency** — full round-trip time per message
- **LiveKit stability** — connection, audio streaming, attribute events
- **Real VAD** — Silero VAD processes actual audio frames

### Files

| File | Purpose |
|------|---------|
| `agent-salesmanager/voice_test_agent.py` | Voice test runner |
| `agent-salesmanager/test_scenarios.json` | Same scenarios as text mode |
| `agent-salesmanager/voice_test_results.log` | Last run output (auto-generated) |

### Running voice tests

Same as text mode — runs inside the Docker container:

```bash
# List scenarios
docker exec aimediaflow-salesmanager python3 /app/voice_test_agent.py --list

# Run single scenario (shorter waits)
docker exec aimediaflow-salesmanager python3 /app/voice_test_agent.py --scenario hoodie_browse --no-pause

# Run single scenario with realistic pauses
docker exec aimediaflow-salesmanager python3 /app/voice_test_agent.py --scenario hoodie_browse

# Run all scenarios
docker exec aimediaflow-salesmanager python3 /app/voice_test_agent.py --no-pause
```

### Reading the output

```
[You #1]: hey, do you have any hoodies?
  Audio: 1478ms (70968 samples @ 48000Hz)    ← TTS duration
  → UI: recommended: [p002,p001]             ← set_attributes received from agent
  UI state: recommended=[p002,p001]          ← cumulative state

[You #5]: ok close that, show me the Oversized Hoodie instead
  Audio: 3601ms
  → UI: expanded: CLOSED                     ← close_product called
  → UI: recommended: [p002] | expanded: p002 ← expand_product called
  UI state: recommended=[p002] | expanded=p002
```

### Deploying voice_test_agent.py to server

```bash
scp -i .ssh_hetzner_key agent-salesmanager/voice_test_agent.py root@46.62.246.93:/tmp/
ssh -i .ssh_hetzner_key root@46.62.246.93 "docker cp /tmp/voice_test_agent.py aimediaflow-salesmanager:/app/"
```

### Technical details

- Piper TTS output: 22050Hz mono int16 PCM
- Resampled to 48000Hz (LiveKit requirement) via `livekit.rtc.AudioResampler`
- Streamed in 20ms chunks (960 samples) via `AudioSource.capture_frame()`
- Agent dispatched via `livekit.api.AgentDispatchService.create_dispatch()`
- UI state tracked via `room.on("participant_attributes_changed")`

### Known issues fixed during implementation

- **`close_product` schema error**: Groq API rejects tools with no parameters (`properties` missing). Fixed by adding a dummy `confirm: str = ""` parameter to `close_product` in `agent.py`
- **Agent not joining room**: Named agents require explicit dispatch via `create_dispatch()` — room creation alone is not enough

---

## Test results history

| Date | Mode | Scenarios | Result |
|------|------|-----------|--------|
| 2026-03-02 | Text (headless) | 10/10 | ✅ All passed — close_product and named search fixes verified |
| 2026-03-02 | Voice (LiveKit) | 1/10 (hoodie_browse) | ✅ STT, tool calls, UI state all working end-to-end |
| 2026-03-02 | Text (headless) | cart_full_flow | ✅ add_to_cart, expand, close, remove, read_cart — all tools correct, prices correct |
| 2026-03-02 | Voice (LiveKit) | cart_full_flow | ✅ Full voice flow: STT, product search, expand/close, cart voice commands end-to-end |
