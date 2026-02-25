import { MyDurableObject, ChatMemoryDO  } from "./agent-do.js";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

	if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, path: url.pathname });
    }

	if (url.pathname.startsWith("/debug")) {
  return Response.json({
    method: req.method,
    pathname: url.pathname,
    url: req.url,
    contentType: req.headers.get("content-type"),
  });
}


    // POST /ask { "sessionId": "abc", "question": "..." }
    if (req.method === "POST" && url.pathname === "/ask") {
      const body = await req.json().catch(() => null);
      if (!body?.sessionId || !body?.question) {
        return Response.json({ error: "sessionId and question required" }, { status: 400 });
      }

      // 1) Get DO for this session
      const id = env.CHAT_DO.idFromName(body.sessionId);
	  const stub = env.CHAT_DO.get(id);

      // 2) Read history from DO
      const historyResp = await stub.fetch("https://do.local/history");
      const history = await historyResp.json(); // [{role, content}, ...]

      // 3) Call Workers AI (Llama)
      const messages = [
        { role: "system", content: "You are a helpful Q&A assistant. Keep answers concise and correct." },
        ...history,
        { role: "user", content: body.question },
      ];

      const aiResp = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages,
        max_tokens: 500,
      });

      const answer =
        aiResp?.response ??
        aiResp?.output_text ??
        aiResp?.result ??
        JSON.stringify(aiResp);

      // 4) Save new turn to DO
      await stub.fetch("https://do.local/append", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([
          { role: "user", content: body.question },
          { role: "assistant", content: answer },
        ]),
      });

      return Response.json({ answer });
    }

    return new Response("Not found", { status: 404 });
  },
};

export { MyDurableObject, ChatMemoryDO  };