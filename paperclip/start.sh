#!/bin/bash
export DATABASE_URL=postgres://paperclip:paperclip@localhost:5433/paperclip
export PORT=3100
export HOST=0.0.0.0
export SERVE_UI=true
export PAPERCLIP_DEPLOYMENT_MODE=authenticated
export PAPERCLIP_DEPLOYMENT_EXPOSURE=private
export PAPERCLIP_PUBLIC_URL=http://65.21.3.89:3100
export BETTER_AUTH_SECRET=5cc3461b700d506b440dccec37c6d0225c12e489a30e0984eee2d4a7b0a7c932
export PAPERCLIP_AGENT_JWT_SECRET=5cc3461b700d506b440dccec37c6d0225c12e489a30e0984eee2d4a7b0a7c932
export PAPERCLIP_HOME=/opt/paperclip-data
export PAPERCLIP_MIGRATION_PROMPT=never
export PAPERCLIP_MIGRATION_AUTO_APPLY=true

cd /opt/paperclip/server
exec /opt/paperclip/server/node_modules/.bin/tsx src/index.ts
