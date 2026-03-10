# LiveKit Agents SDK — Key Findings

SDK version used: **livekit-agents 1.4.1**

---

## Critical: Proactive Speech (calling generate_reply without a user turn)

### Problem
Calling `session.generate_reply()` from a raw `asyncio.sleep` watchdog task produces **LLM output (~150ms) but NO TTS audio**. The `tts_metrics` event never fires. This is a known race condition in the SDK.

**Root cause:** `generate_reply` internally creates a `SpeechHandle` that requires `_authorize_generation()` before TTS execution. When called from a background task running concurrently with any ongoing session activity cleanup, the activity state is unsettled — the LLM pipeline runs but the speech handle is silently dropped.

**Symptom in logs:**
```
14:40:54 — Silence watchdog: prompting user after inactivity
14:40:55 — LLM duration: 154ms   ← LLM ran
[NO TTS ttfb]                     ← TTS never played
```

### Official Solution: `user_away_timeout` + `user_state_changed`

The LiveKit team's answer (GitHub issue #2533): use the built-in `user_away_timeout` parameter on `AgentSession`, then listen to `user_state_changed`. The event fires only when the session is in a clean idle state — `generate_reply` and `session.say()` work reliably from here.

```python
session = AgentSession(
    vad=silero.VAD.load(),
    user_away_timeout=40.0,   # seconds of VAD silence before "away" fires
    ...
)

inactivity_task: asyncio.Task | None = None

async def inactivity_check():
    await session.say("Still there? Any questions?", allow_interruptions=True)
    await asyncio.sleep(25)
    if agent._ending:
        return
    agent._ending = True
    await session.say("It was lovely chatting, take care now!", allow_interruptions=False)
    await asyncio.sleep(4)
    await delete_room(ctx.room.name)

@session.on("user_state_changed")
def on_user_state_changed(ev):
    nonlocal inactivity_task
    if ev.new_state == "away":
        if not agent._ending:
            inactivity_task = asyncio.create_task(inactivity_check())
    else:
        if inactivity_task is not None and not inactivity_task.done():
            inactivity_task.cancel()
            inactivity_task = None
```

### `session.say()` vs `generate_reply()` for proactive speech

| Method | Use case | Reliability |
|--------|----------|-------------|
| `session.say("fixed text")` | Fixed phrases, proactive speech, farewell | **Reliable** — bypasses LLM, goes directly to TTS |
| `session.generate_reply(instructions=...)` | Dynamic LLM-generated responses | **Unreliable** from background tasks; reliable only inside `on_user_turn_completed` or immediately after `session.start()` |

**Rule:** For any proactive/timed speech (silence prompts, farewells, time warnings), always use `session.say()`.

---

## AgentSession Events

| Event | When it fires | Notes |
|-------|---------------|-------|
| `user_state_changed` | User VAD state changes | States: `"listening"`, `"speaking"`, `"away"` |
| `metrics_collected` | Each pipeline stage completes | `ev.metrics.type`: `"eou_metrics"`, `"llm_metrics"`, `"tts_metrics"` |
| `conversation_item_added` | LLM text is ready | Fires **before** TTS starts — do NOT reset timers here |
| `agent_state_changed` | Agent internal state changes | States visible as LiveKit participant attributes |

### metrics_collected types
- `eou_metrics` — end-of-utterance, field: `transcription_delay`
- `llm_metrics` — LLM generation done, field: `duration`
- `tts_metrics` — TTS first byte, field: `ttfb` — this is the real "agent started speaking" signal

### `conversation_item_added` vs `tts_metrics` timing
- `conversation_item_added` fires when LLM text is ready — TTS has NOT started yet
- `tts_metrics` fires when TTS first audio byte is sent — agent is truly speaking
- If you reset a silence timer, use `tts_metrics`, not `conversation_item_added`

---

## Participant Attributes (Agent State in UI)

Agent state is exposed via LiveKit participant attributes. Read in frontend:
```typescript
room.on(RoomEvent.ParticipantAttributesChanged, (attrs, participant) => {
    const s = attrs['lk.agent.state'] ?? attrs['agent_state'] ?? attrs['livekit.agent_state'];
    if (s) setAgentThinkingState(s); // 'listening' | 'thinking' | 'speaking'
});
```

---

## Room Management

### Delete room server-side (triggers RoomEvent.Disconnected in all clients)
```python
from livekit import api as lk_api

async def delete_room(room_name: str):
    async with lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lkapi:
        await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=room_name))
```

Always add a delay before delete to let TTS finish playing:
```python
await session.say("Goodbye!")
await asyncio.sleep(4)
await delete_room(ctx.room.name)
```

### RPC from agent to client (e.g., trigger UI action)
```python
# Agent side — in entrypoint after room.connect()
await ctx.room.local_participant.perform_rpc(
    destination_identity="user",
    method="end_call",
    payload=json.dumps({"reason": "timeout"}),
)
```
```typescript
// Client side
room.registerRpcMethod('end_call', async (data) => {
    setState('ending');
    setTimeout(() => disconnect(), 2000);
    return JSON.stringify({ success: true });
});
```

---

## STT / TTS Config (our setup)

```python
stt=openai.STT(
    model="parakeet-tdt-0.6b-v3",
    base_url="http://parakeet-stt:5092/v1",
    api_key="not-needed",
)
tts=openai.TTS(
    model="tts-1",
    voice="default",          # or "bf_alice" for Kokoro
    response_format="pcm",
    base_url="http://piper-wrapper:8881/v1",   # or kokoro-tts:8880
    api_key="not-needed",
)
```

**Critical:** STT and TTS use different containers. Never mix up their `base_url`.

---

## Turn Detection

```python
from livekit.plugins.turn_detector.english import EnglishModel

session = AgentSession(
    turn_detection=EnglishModel(),
    min_endpointing_delay=0.5,
    max_endpointing_delay=4.0,
)
```

Model files must be pre-downloaded in Dockerfile (not cached by HuggingFace at runtime in Docker):
```dockerfile
RUN python -c "\
from huggingface_hub import hf_hub_download; \
hf_hub_download(repo_id='livekit/turn-detector', filename='onnx/model_q8.onnx', revision='v1.2.2-en'); \
hf_hub_download(repo_id='livekit/turn-detector', filename='languages.json', revision='v1.2.2-en'); \
hf_hub_download(repo_id='livekit/turn-detector', filename='tokenizer.json', revision='v1.2.2-en'); \
hf_hub_download(repo_id='livekit/turn-detector', filename='tokenizer_config.json', revision='v1.2.2-en'); \
print('turn-detector model downloaded OK')"
```

---

## Common Pitfalls

1. **`generate_reply` from background task** — silently drops TTS. Use `session.say()` or trigger from `user_state_changed`.

2. **`conversation_item_added` fires before TTS** — don't use this to detect "agent finished speaking". Use `tts_metrics` for "started" or calculate based on text length.

3. **Farewell echo:** Agent says "take care now!" → Parakeet STT picks up the echo → falsely triggers farewell detection. Solution: don't include phrases the agent itself says in `FAREWELL_WORDS`.

4. **Docker image caching COPY layers** — always use `--no-cache` when rebuilding agent images.

5. **`user_away_timeout` counts VAD silence** — it resets automatically when the agent speaks (because VAD detects agent's own audio as activity). This means the 40s timer naturally starts after the agent finishes speaking.

---

## Relevant GitHub Issues

- [#2533 — Support for Silence-Based VAD Callbacks](https://github.com/livekit/agents/issues/2533) — official `user_away_timeout` answer
- [#3148 — Timely ending a session gracefully mid-conversation](https://github.com/livekit/agents/issues/3148)
- [#3149 — session.say and generate_reply only trigger on session.run](https://github.com/livekit/agents/issues/3149)
- [#3418 — Agent becomes silent after interruption](https://github.com/livekit/agents/issues/3418)
- [#3560 — generate_reply timed out waiting for generation_created event](https://github.com/livekit/agents/issues/3560)
- [Official inactive_user.py example](https://github.com/livekit/agents/blob/main/examples/voice_agents/inactive_user.py)
