# Llama Agent with Memory on Cloudflare (Workers AI + Durable Objects)

This project implements a basic LLM “agent” (chat Q&A) using:
- **Cloudflare Workers** as the HTTP API + orchestration layer
- **Workers AI** to run **Meta Llama 3.1 Instruct**
- **Durable Objects** to provide **per-session memory**

No Docker. No servers.

---

## Architecture

Client → Worker (`src/index.js`) → Durable Object (`src/agent-do.js`) → Workers AI (Llama)

### Components

#### 1) Worker (router + orchestration)
File: `src/index.js`

Responsibilities:
- Exposes HTTP endpoints: `/health`, `/ask`, `/reset` (optional), `/debug` (optional)
- Validates request body
- Picks a Durable Object instance based on `sessionId`
- Reads chat history from DO
- Calls Workers AI (Llama) with: system prompt + history + new user question
- Writes the new turn back to DO

Important:
- A Worker is mostly stateless. Any “memory” must be stored elsewhere (Durable Objects, D1, KV, etc.).

#### 2) Durable Object (memory store)
File: `src/agent-do.js`

Responsibilities:
- Stores conversation history in `this.state.storage`
- Provides internal endpoints called by the Worker:
  - `GET /history` → returns array of messages
  - `POST /append` → appends new messages and saves
  - `POST /reset` → clears history

Session isolation:
- Each `sessionId` maps to a separate DO instance:
  - `idFromName(sessionId)` ensures same name → same object instance

#### 3) Workers AI (LLM inference)
Binding: `env.AI`

Usage:
- `env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages, max_tokens, temperature })`

---

## Why there are TWO Durable Object bindings in this repo

You may see:
- `MY_DURABLE_OBJECT` → legacy DO class
- `CHAT_DO` → current memory DO class

Reason:
- Cloudflare may refuse deploys if older DO classes that already exist are not exported (dependency safety).
- To avoid breaking existing DOs, we keep the legacy class export and introduce a **new** SQLite-backed DO for memory.

---

## Configuration: `wrangler.toml`

Key fields:

- `name`  
  Worker script name in Cloudflare

- `main`  
  Entrypoint file (e.g., `src/index.js`)

- `compatibility_date`  
  Worker runtime compatibility date (pin for consistent behavior)

### AI binding
Creates `env.AI`:

```toml
[ai]
binding = "AI"
