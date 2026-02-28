FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download turn-detector model files from HuggingFace during build
RUN python -c "\
from huggingface_hub import hf_hub_download; \
hf_hub_download(repo_id='livekit/turn-detector', filename='onnx/model_q8.onnx', revision='v1.2.2-en'); \
hf_hub_download(repo_id='livekit/turn-detector', filename='languages.json', revision='v1.2.2-en'); \
hf_hub_download(repo_id='livekit/turn-detector', filename='tokenizer.json', revision='v1.2.2-en'); \
hf_hub_download(repo_id='livekit/turn-detector', filename='tokenizer_config.json', revision='v1.2.2-en'); \
print('turn-detector model downloaded OK')"

COPY agent.py session_logger.py .

CMD ["python", "agent.py", "start"]
