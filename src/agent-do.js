// KEEP this exactly (or your existing implementation)
export class MyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    return new Response("legacy DO ok");
  }
}

// NEW: the memory DO used by /ask
export class ChatMemoryDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/history") {
      const history = (await this.state.storage.get("history")) || [];
      return Response.json(history);
    }

    if (request.method === "POST" && url.pathname === "/append") {
      const items = await request.json().catch(() => null);
      if (!Array.isArray(items)) {
        return Response.json({ error: "Expected array" }, { status: 400 });
      }

      const history = (await this.state.storage.get("history")) || [];
      for (const m of items) {
        if (m?.role && typeof m?.content === "string") history.push(m);
      }
      await this.state.storage.put("history", history.slice(-40));
      return Response.json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/reset") {
      await this.state.storage.delete("history");
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
}
