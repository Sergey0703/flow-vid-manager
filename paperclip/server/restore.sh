#!/bin/bash
# Restore Paperclip server patches after update
# Run: bash paperclip/server/restore.sh

EXECUTE_JS="/opt/paperclip/node_modules/.pnpm/hermes-paperclip-adapter@0.2.0/node_modules/hermes-paperclip-adapter/dist/server/execute.js"

echo "Patching execute.js: read taskId from ctx.context (contextSnapshot)..."
sed -i 's/const taskId = cfgString(ctx\.config?.taskId);/const taskId = cfgString(ctx.config?.taskId) ?? cfgString(ctx.context?.taskId) ?? cfgString(ctx.context?.issueId);/g' "$EXECUTE_JS"
sed -i 's/const taskTitle = cfgString(ctx\.config?.taskTitle) || \"\";/const taskTitle = cfgString(ctx.config?.taskTitle) ?? cfgString(ctx.context?.taskTitle) ?? \"\";/g' "$EXECUTE_JS"
sed -i 's/const taskBody = cfgString(ctx\.config?.taskBody) || \"\";/const taskBody = cfgString(ctx.config?.taskBody) ?? cfgString(ctx.context?.taskBody) ?? \"\";/g' "$EXECUTE_JS"
sed -i 's/const commentId = cfgString(ctx\.config?.commentId) || \"\";/const commentId = cfgString(ctx.config?.commentId) ?? cfgString(ctx.context?.commentId) ?? \"\";/g' "$EXECUTE_JS"
sed -i 's/const wakeReason = cfgString(ctx\.config?.wakeReason) || \"\";/const wakeReason = cfgString(ctx.config?.wakeReason) ?? cfgString(ctx.context?.wakeReason) ?? \"\";/g' "$EXECUTE_JS"

echo "Verifying patch..."
grep -c 'ctx.context' "$EXECUTE_JS" && echo "OK: patch applied" || echo "ERROR: patch failed"

echo ""
echo "Restoring agent adapter_configs in DB..."

COMPANY="b984404a-8587-41d0-9354-a6251bd0fd94"

restore_agent() {
  local NAME=$1
  local ID=$2
  local CONFIG=$3
  python3 -c "
import json, subprocess
config = $CONFIG
j = json.dumps(config)
sql = \"UPDATE agents SET adapter_config = '\" + j.replace(\"'\",\"''\") + \"'::jsonb WHERE id = '$ID';\"
open('/tmp/restore_agent.sql','w').write(sql)
"
  docker cp /tmp/restore_agent.sql paperclip-db:/tmp/restore_agent.sql
  docker exec paperclip-db psql -U paperclip -d paperclip -f /tmp/restore_agent.sql
  echo "  $NAME: restored"
}

# Researcher (main research agent)
restore_agent "Researcher" "ccc8c5e8-cc55-4432-aa16-0bc73391049e" '{
  "toolsets": "web,terminal",
  "paperclipSkillSync": {"desiredSkills": ["paperclipai/paperclip/paperclip","paperclipai/paperclip/paperclip-create-agent","paperclipai/paperclip/paperclip-create-plugin","paperclipai/paperclip/para-memory-files","local/63cff8d1a8/content-factory-pipeline","local/1548aa4440/dual-search"]},
  "instructionsFilePath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/ccc8c5e8-cc55-4432-aa16-0bc73391049e/instructions/AGENTS.md",
  "instructionsRootPath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/ccc8c5e8-cc55-4432-aa16-0bc73391049e/instructions",
  "instructionsEntryFile": "AGENTS.md", "instructionsBundleMode": "managed"
}'

# SME Facts Researcher
restore_agent "SME Facts Researcher" "acf7ffec-4aef-43be-b83b-828170c15b17" '{
  "toolsets": "web,terminal",
  "paperclipSkillSync": {"desiredSkills": ["paperclipai/paperclip/paperclip","paperclipai/paperclip/para-memory-files","local/63cff8d1a8/content-factory-pipeline","local/1548aa4440/dual-search"]},
  "instructionsFilePath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/acf7ffec-4aef-43be-b83b-828170c15b17/instructions/AGENTS.md",
  "instructionsRootPath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/acf7ffec-4aef-43be-b83b-828170c15b17/instructions",
  "instructionsEntryFile": "AGENTS.md", "instructionsBundleMode": "managed"
}'

# Case Studies Researcher
restore_agent "Case Studies Researcher" "527db020-5bf8-41e0-bf8d-20e007e7056e" '{
  "toolsets": "web,terminal",
  "paperclipSkillSync": {"desiredSkills": ["paperclipai/paperclip/paperclip","paperclipai/paperclip/para-memory-files","local/63cff8d1a8/content-factory-pipeline","local/1548aa4440/dual-search"]},
  "instructionsFilePath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/527db020-5bf8-41e0-bf8d-20e007e7056e/instructions/AGENTS.md",
  "instructionsRootPath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/527db020-5bf8-41e0-bf8d-20e007e7056e/instructions",
  "instructionsEntryFile": "AGENTS.md", "instructionsBundleMode": "managed"
}'

# AgentMail Monitor
restore_agent "AgentMail Monitor" "b948c00d-abbd-45a0-8520-e8458fc7b11c" '{
  "toolsets": "web,terminal",
  "paperclipSkillSync": {"desiredSkills": ["paperclipai/paperclip/paperclip","paperclipai/paperclip/para-memory-files","local/63cff8d1a8/content-factory-pipeline"]},
  "instructionsFilePath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/b948c00d-abbd-45a0-8520-e8458fc7b11c/instructions/AGENTS.md",
  "instructionsRootPath": "/opt/paperclip-data/instances/default/companies/'"$COMPANY"'/agents/b948c00d-abbd-45a0-8520-e8458fc7b11c/instructions",
  "instructionsEntryFile": "AGENTS.md", "instructionsBundleMode": "managed"
}'

echo ""
echo "Restarting Paperclip..."
pm2 restart paperclip
echo "Done!"
