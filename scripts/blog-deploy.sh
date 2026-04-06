#!/bin/bash
# Blog Deploy Script
# Runs on Server 2 (65.21.3.89)
# Checks for ready articles in /home/hermes_user/.hermes/blog-drafts/
# Copies them + cover images to GitHub repo, commits, pushes → Vercel deploys
#
# Setup:
#   chmod +x /opt/blog-deploy/blog-deploy.sh
#   crontab: 0 7,19 * * * /opt/blog-deploy/blog-deploy.sh >> /opt/blog-deploy/blog-deploy.log 2>&1

set -euo pipefail

DRAFTS_DIR="/home/hermes_user/.hermes/blog-drafts"
COVERS_DIR="/home/hermes_user/.hermes/blog-covers"
REPO_DIR="/opt/blog-deploy/repo"
PUBLISHED_FILE="/opt/blog-deploy/.published"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# Load env (GITHUB_TOKEN, GITHUB_REPO, GITHUB_USER)
ENV_FILE="/opt/blog-deploy/.env"
if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi

# Required vars
: "${GITHUB_TOKEN:?GITHUB_TOKEN not set in $ENV_FILE}"
: "${GITHUB_REPO:?GITHUB_REPO not set (e.g. Sergey0703/flow-vid-manager)}"
: "${GITHUB_USER:?GITHUB_USER not set}"
: "${GITHUB_EMAIL:?GITHUB_EMAIL not set}"

REPO_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

echo "$LOG_PREFIX Blog deploy script started"

# Create dirs if needed
mkdir -p "$(dirname "$PUBLISHED_FILE")"
touch "$PUBLISHED_FILE"

# Find ready articles
READY_ARTICLES=()
for f in "$DRAFTS_DIR"/*.md; do
  [ -f "$f" ] || continue
  slug=$(basename "$f" .md)

  # Skip if already published
  if grep -qxF "$slug" "$PUBLISHED_FILE" 2>/dev/null; then
    continue
  fi

  # Check for status: ready in frontmatter
  if grep -qE "^status:\s*ready" "$f"; then
    READY_ARTICLES+=("$f")
    echo "$LOG_PREFIX Found ready article: $slug"
  fi
done

if [ ${#READY_ARTICLES[@]} -eq 0 ]; then
  echo "$LOG_PREFIX No new ready articles found. Exiting."
  exit 0
fi

# Clone or pull repo
if [ -d "$REPO_DIR/.git" ]; then
  echo "$LOG_PREFIX Pulling latest from GitHub..."
  git -C "$REPO_DIR" remote set-url origin "$REPO_URL"
  git -C "$REPO_DIR" pull --rebase origin main
else
  echo "$LOG_PREFIX Cloning repo..."
  rm -rf "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
fi

git -C "$REPO_DIR" config user.name "Blog Deploy Bot"
git -C "$REPO_DIR" config user.email "$GITHUB_EMAIL"

CHANGED=0

for f in "${READY_ARTICLES[@]}"; do
  slug=$(basename "$f" .md)

  # Copy article
  DEST="$REPO_DIR/content/blog/$(basename "$f")"
  mkdir -p "$REPO_DIR/content/blog"
  cp "$f" "$DEST"
  echo "$LOG_PREFIX Copied article: $(basename $f)"

  # Find and copy cover image (matches slug pattern)
  COVER_SRC=""
  for ext in webp jpg jpeg png; do
    candidate="$COVERS_DIR/${slug}.${ext}"
    if [ -f "$candidate" ]; then
      COVER_SRC="$candidate"
      break
    fi
  done

  if [ -n "$COVER_SRC" ]; then
    mkdir -p "$REPO_DIR/public/blog-covers"
    cp "$COVER_SRC" "$REPO_DIR/public/blog-covers/"
    echo "$LOG_PREFIX Copied cover image: $(basename $COVER_SRC)"
  else
    echo "$LOG_PREFIX No cover image found for $slug (looked for webp/jpg/jpeg/png)"
  fi

  # Mark as published in the draft file (change status: ready → status: published)
  sed -i 's/^status: ready/status: published/' "$f"
  echo "$LOG_PREFIX Marked $slug as published"

  # Record in published list
  echo "$slug" >> "$PUBLISHED_FILE"

  CHANGED=$((CHANGED + 1))
done

# Commit and push if anything changed
if [ "$CHANGED" -gt 0 ]; then
  git -C "$REPO_DIR" add content/blog/ public/blog-covers/ 2>/dev/null || true
  git -C "$REPO_DIR" add content/blog/ 2>/dev/null || true

  ARTICLE_NAMES=$(for f in "${READY_ARTICLES[@]}"; do basename "$f" .md; done | tr '\n' ', ' | sed 's/,$//')
  COMMIT_MSG="blog: publish $CHANGED article(s) — $ARTICLE_NAMES"

  git -C "$REPO_DIR" commit -m "$COMMIT_MSG"
  git -C "$REPO_DIR" push origin main

  echo "$LOG_PREFIX Pushed $CHANGED article(s) to GitHub. Vercel will deploy automatically."
else
  echo "$LOG_PREFIX Nothing to commit."
fi

echo "$LOG_PREFIX Done."
