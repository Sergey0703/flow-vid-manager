FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download turn detector model at build time
RUN python agent.py download-files

ENV PYTHONUNBUFFERED=1

CMD ["python", "agent.py", "start"]
