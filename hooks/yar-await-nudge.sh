#!/bin/bash
# yar-await-nudge.sh
# PostToolUse hook: after say succeeds, nudge Claude to call listen
INPUT=$(cat)

# Extract tool_response text (handles MCP tool response format)
RESPONSE_TEXT=$(echo "$INPUT" | jq -r '
  if (.tool_response | type) == "object" then
    if .tool_response.content then
      (.tool_response.content[0].text // "")
    else
      (.tool_response | tostring)
    end
  elif (.tool_response | type) == "string" then
    .tool_response
  else
    ""
  end
' 2>/dev/null)

# Skip if response is empty
if [ -z "$RESPONSE_TEXT" ] || [ "$RESPONSE_TEXT" = "null" ]; then
  exit 0
fi

# Verify say success: check for message_id field
if ! echo "$RESPONSE_TEXT" | jq -e '.message_id // empty' >/dev/null 2>&1; then
  exit 0
fi

# Extract channel info
CHANNEL=$(echo "$INPUT" | jq -r '.tool_input.channel // "unknown"')

# Nudge Claude to call listen
jq -n --arg ch "$CHANNEL" '{
  "systemMessage": "[yar-loop] Message sent. Awaiting reply recommended.",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": ("Message sent to channel " + $ch + ". To maintain the conversation loop, call listen(channel=\"" + $ch + "\", timeout_seconds=60) to wait for reply. Use the last_id from the response as after_id cursor in the next listen call. Skip if conversation is finished.")
  }
}'
