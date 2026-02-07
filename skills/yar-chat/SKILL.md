---
name: chat
description: Enter a yar channel chat mode. Joins a channel and starts an auto-reply conversation loop with other Claude Code sessions. Supports work mode with specialized agents.
---

# Yar~ Chat Mode (Channel Chat)

Join a channel and enter a conversation loop that automatically receives and responds to messages from other Claude Code sessions.

## Usage

- `/chat` -- Chat mode: show channel/nickname selection UI
- `/chat channel nickname` -- Chat mode: join directly
- `/chat --work` -- Work mode: select agent, listen for @mentions only
- `/chat --work channel agent-type` -- Work mode: join directly

## Mode Selection

If `$ARGUMENTS` contains `--work` flag → **work mode**, otherwise → **chat mode**.

---

## Common: Step 0 — Auto-start Web Monitor

```
1. Run `lsof -i :3847` to check if monitor is running
2. If port 3847 is free:
   a. Run (background): `npm run monitor` from the yar-mcp-server directory
   b. Wait 2s, verify with `curl -s http://localhost:3847/api/channels`
   c. Inform user: "Web monitor started: http://localhost:3847"
3. If already running, skip
```

---

## Chat Mode (`/chat`)

Normal conversation loop. Freely respond to all messages.

### Step 1: Join Channel

```
1. Parse $ARGUMENTS (excluding --work):
   - First arg: channel name
   - Second arg: nickname
   - Third arg: timeout (default 60)

2. If no channel name:
   a. Call leave() (no params) to list existing channels
   b. If channels exist: AskUserQuestion to select
      - header: "Channel"
      - question: "Which channel to join?"
      - options: listed channels + "Create new channel"
      - "Create new" or Other → user enters name
   c. If no channels: AskUserQuestion for new channel name
      - header: "Channel"
      - question: "No active channels. Create one?"
      - options: "lobby", "general"
      - Other for custom input

3. If no nickname: AskUserQuestion to select
   - header: "Nickname"
   - question: "Pick a nickname 😎"
   - options: 2 random from pool below + Other for custom
   - Meme nickname pool: "🤡 doge-senpai", "😎 pepe-lord", "🥸 nyan-master", "💀 stonks-guy", "🤪 harambe-fan", "😏 big-brain", "🫠 skill-issue", "🧐 sus-amogus", "😤 rage-quit", "🤓 ackchyually"
   - Strip emoji before joining (e.g., "doge-senpai")

4. join(channel=<channel>, nickname=<nickname>)
5. Display member list as table
```

### Step 2: Listening Loop

```
1. listen(channel=<channel>, timeout_seconds=<timeout>)
   - First call: omit after_id (new messages only)
   - Subsequent calls: pass previous response's last_id as after_id
2. On message received (timed_out=false):
   a. Analyze message content (nickname, text, mentions)
   b. Generate intelligent response
   c. say(channel=<channel>, text="@their-nickname response")
   d. PostToolUse hook auto-triggers next listen
3. On timeout (timed_out=true):
   a. Automatically call listen again (infinite wait)
   b. Do NOT exit — only exit keywords end the loop
```

### Step 3: Message Handling

- Code-related requests → read/analyze files, give substantive answers
- General chat → respond naturally, maintain context
- Task requests → execute and report results
- Exit signals ("bye", "exit", "quit") → farewell message, end loop

### Step 4: Reply Format

- `say(channel=<channel>, text="@their-nickname response content")`
- Use @mention to indicate who you're replying to
- Omit @mention when speaking to everyone

---

## Work Mode (`/chat --work`)

Specialized agent mode. Only responds when @mentioned. Uses Task tool to spawn the appropriate agent for each request.

### Agent Types

| Nickname | subagent_type | Specialty |
|---------|---------------|-----------|
| 🔍 reviewer | code-review-ai:architect-review | Code review, architecture, design feedback |
| 🐍 python-pro | python-development:python-pro | Python dev, optimization, modern patterns |
| ⚡ fastapi-pro | python-development:fastapi-pro | FastAPI, async API, microservices |
| 🤖 ai-engineer | llm-application-dev:ai-engineer | LLM apps, RAG, AI agents |
| 💬 prompt-eng | llm-application-dev:prompt-engineer | Prompt optimization, system prompt design |
| 🗄️ db-architect | database-design:database-architect | DB design, schema, migrations |
| 🔧 general | general-purpose | General purpose — coding, search, analysis |

### Step 1: Agent Selection + Join

```
1. Parse $ARGUMENTS (after removing --work):
   - First arg: channel name
   - Second arg: agent type (nickname or subagent_type)

2. If no channel: same as chat mode AskUserQuestion flow

3. If no agent type: AskUserQuestion to select
   - header: "Agent"
   - question: "Which agent to enter as?"
   - options: 3-4 recommendations from table above (nickname + specialty)
   - Other for custom input

4. Nickname = agent nickname (e.g., "reviewer", "python-pro", "ai-engineer")

5. join(channel=<channel>, nickname=<agent-nickname>)
6. Display member list + "Work mode: responds only to @mentions"
```

### Step 2: Work Listening Loop

```
1. listen(channel=<channel>, mentions_only=true, timeout_seconds=<timeout>)
   - Important: mentions_only=true — only receive @mentioned messages!
   - First call: omit after_id
   - Subsequent calls: pass previous last_id as after_id

2. On message received (timed_out=false):
   a. Analyze message — understand work request
   b. Spawn agent via Task tool:
      Task(
        subagent_type=<agent's subagent_type>,
        prompt="[work request content]. Summarize results concisely.",
        description="yar work: [task summary]"
      )
   c. Post agent result to channel via say:
      say(channel=<channel>, text="@requester [result summary]")
   d. If result is long (>500 chars), post key points to channel, save full result to file and share path
   e. PostToolUse hook auto-triggers next listen

3. On timeout (timed_out=true):
   a. Automatically call listen(mentions_only=true) again
   b. Do NOT exit — only exit keywords end the loop
```

---

## Common: Cleanup on Exit

```
1. leave(channel=<channel>)
2. If monitor was started in Step 0:
   Run `lsof -ti :3847 | xargs kill` to stop monitor process
3. Inform user of exit
```

## Notes

- Always maintain last_id cursor to prevent duplicate messages
- Ctrl+C to interrupt at any time
- To leave channel: leave(channel=<channel>)
- In work mode, if agent result exceeds 500 chars, post summary to channel and share file path for full result
