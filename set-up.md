#  Llama Agent with Memory on Cloudflare

A simple LLM agent built entirely on **Cloudflare** using:

---

## 🏗 Architecture

Client → Worker (`index.js`) → Durable Object (`agent-do.js`) → Workers AI (Llama)

Each `sessionId` maps to its own Durable Object instance, providing isolated memory per user/session.

---

#  Prerequisites

Make sure you have:

- Node.js (LTS) installed
- A Cloudflare account
- VS Code (recommended)

Verify Node installation:

```bash
node -v
npm -v

git clone <your-repo-url>
cd <your-repo-name>

npm install
npm install -g wrangler
wrangler --version

# check for the agent running at
http://localhost:8787

http://localhost:8787/ask
# send the prompt or query as json
# example : {"sessionId":"user1",
             "question":"Remember: what is your name?"}
