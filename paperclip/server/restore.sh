#!/bin/bash
# Restore Paperclip server patches after update
# Run: bash paperclip/server/restore.sh

EXECUTE_JS="/opt/paperclip/node_modules/.pnpm/hermes-paperclip-adapter@0.2.0/node_modules/hermes-paperclip-adapter/dist/server/execute.js"

echo "Patching execute.js via Python (safer than sed for complex replacements)..."
python3 << 'PYEOF'
import sys
f = '/opt/paperclip/node_modules/.pnpm/hermes-paperclip-adapter@0.2.0/node_modules/hermes-paperclip-adapter/dist/server/execute.js'
content = open(f).read()

# Patch 1: taskId + other fields from ctx.context (buildPrompt section)
content = content.replace(
    'const taskId = cfgString(ctx.config?.taskId);\n    const taskTitle = cfgString(ctx.config?.taskTitle) || "";\n    const taskBody = cfgString(ctx.config?.taskBody) || "";\n    const commentId = cfgString(ctx.config?.commentId) || "";\n    const wakeReason = cfgString(ctx.config?.wakeReason) || "";',
    'const taskId = cfgString(ctx.config?.taskId) ?? cfgString(ctx.context?.taskId) ?? cfgString(ctx.context?.issueId);\n    const taskTitle = cfgString(ctx.config?.taskTitle) ?? cfgString(ctx.context?.taskTitle) ?? "";\n    const taskBody = cfgString(ctx.config?.taskBody) ?? cfgString(ctx.context?.taskBody) ?? "";\n    const commentId = cfgString(ctx.config?.commentId) ?? cfgString(ctx.context?.commentId) ?? "";\n    const wakeReason = cfgString(ctx.config?.wakeReason) ?? cfgString(ctx.context?.wakeReason) ?? "";'
)

# Patch 2: add paperclipApiKey to template vars
content = content.replace(
    '        paperclipApiUrl,\n    };',
    '        paperclipApiUrl,\n        paperclipApiKey: ctx.authToken || "",\n    };'
)

# Patch 3: taskId from ctx.context in execute() section
content = content.replace(
    '    const taskId = cfgString(ctx.config?.taskId);\n    if (taskId)\n        env.PAPERCLIP_TASK_ID = taskId;',
    '    const taskId = cfgString(ctx.config?.taskId) ?? cfgString(ctx.context?.taskId) ?? cfgString(ctx.context?.issueId);\n    if (taskId)\n        env.PAPERCLIP_TASK_ID = taskId;'
)

# Patch 4: inject PAPERCLIP_API_KEY + HOME into env
content = content.replace(
    '    if (ctx.runId)\n        env.PAPERCLIP_RUN_ID = ctx.runId;',
    '    if (ctx.runId)\n        env.PAPERCLIP_RUN_ID = ctx.runId;\n    if (ctx.authToken)\n        env.PAPERCLIP_API_KEY = ctx.authToken;\n    if (!env.HOME)\n        env.HOME = "/home/hermes_user";'
)

open(f, 'w').write(content)
print('ctx.context patches:', content.count('ctx.context?.taskId'))
print('paperclipApiKey var:', content.count('paperclipApiKey: ctx.authToken'))
print('PAPERCLIP_API_KEY:', content.count('PAPERCLIP_API_KEY'))
print('HOME patch:', content.count('hermes_user'))
PYEOF

echo "Verifying patch..."
python3 -c "
c = open('$EXECUTE_JS').read()
ok = c.count('ctx.context?.taskId') >= 2 and c.count('PAPERCLIP_API_KEY') >= 1
print('OK: all patches applied' if ok else 'ERROR: patches missing')
"

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
