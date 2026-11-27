
const SITE = "https://cyberameen.github.io";

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": SITE,
      "Access-Control-Allow-Headers": "Content-Type, X-Signal-Token",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return reply({}, 200);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return reply({
        service: "PROJECT SIGNAL",
        status: "ONLINE",
        engine: "Grok",
        mode: "PRIVATE TEST"
      });
    }

    if (url.pathname !== "/analyze" ||
        request.method !== "POST") {
      return reply({ error: "Not found" }, 404);
    }

    if (!env.XAI_API_KEY || !env.SIGNAL_TEST_TOKEN) {
      return reply({ error: "Missing secrets" }, 503);
    }

    const token = request.headers.get("X-Signal-Token");

    if (!token || token !== env.SIGNAL_TEST_TOKEN) {
      return reply({ error: "Unauthorized" }, 401);
    }

const limit = await env.SIGNAL_RATE_LIMITER.limit({
  key: "private-test"
});

if (!limit.success) {
  return reply({
    error: "Rate limit exceeded. Try again in 60 seconds."
  }, 429);
}

    const length = Number(
      request.headers.get("Content-Length") || 0
    );

    if (length > 4096) {
      return reply({ error: "Request too large" }, 413);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return reply({ error: "Invalid JSON" }, 400);
    }

    const question = body?.question;

    if (typeof question !== "string" ||
        !question.trim() ||
        question.length > 1000) {
      return reply({ error: "Invalid question" }, 400);
    }

    try {
      const response = await fetch(
        "https://api.x.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.XAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "grok-4-1-fast-non-reasoning",
            max_tokens: 200,
            messages: [
              {
                role: "system",
                content: "You are PROJECT SIGNAL, a careful UFO/UAP analyst. Distinguish verified facts from speculation. Never invent evidence or citations."
              },
              {
                role: "user",
                content: question.trim()
              }
            ]
          })
        }
      );

      if (!response.ok) {
        return reply({
          error: "Grok API request failed",
          status: response.status
        }, 502);
      }

      const result = await response.json();

      return reply({
        answer: result.choices?.[0]?.message?.content
          || "No response",
        model: "grok-4-1-fast-non-reasoning"
      });

    } catch {
      return reply({
        error: "Connection to Grok failed"
      }, 502);
    }
  }
};
