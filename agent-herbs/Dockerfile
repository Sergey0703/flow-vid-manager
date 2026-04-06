FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download VAD model
RUN python -c "from livekit.plugins import silero; silero.VAD.load()" || true

COPY agent.py .

CMD ["python", "agent.py", "start"]
