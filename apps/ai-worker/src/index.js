const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin = allowed.includes(origin)
    ? origin
    : allowed[0] || "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function respond(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(request, env),
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return respond(request, env, {
        ok: true,
        service: "nuvii-ai-gateway",
        modelServiceConfigured: Boolean(env.NUVII_MODEL_URL),
      });
    }

    if (url.pathname !== "/generate" || request.method !== "POST") {
      return respond(request, env, { error: "Not found." }, 404);
    }

    if (!env.NUVII_MODEL_URL) {
      return respond(
        request,
        env,
        { error: "NUVII_MODEL_URL is not configured on the Worker." },
        503,
      );
    }

    try {
      const body = await request.json();
      const userPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

      if (!userPrompt) {
        return respond(request, env, { error: "A design description is required." }, 400);
      }

      if (userPrompt.length > 700) {
        return respond(request, env, { error: "Keep the description under 700 characters." }, 400);
      }

      const target = `${String(env.NUVII_MODEL_URL).replace(/\/$/, "")}/generate`;
      const headers = { "Content-Type": "application/json" };
      if (env.NUVII_MODEL_TOKEN) {
        headers.Authorization = `Bearer ${env.NUVII_MODEL_TOKEN}`;
      }

      const upstream = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: userPrompt,
          shape: body.shape || "almond",
          length: body.length || "medium",
          baseColor: body.baseColor || "#f7dce5",
        }),
      });

      const payload = await upstream.json();
      if (!upstream.ok) {
        return respond(
          request,
          env,
          { error: payload.detail || payload.error || "Nuvii model service failed." },
          upstream.status,
        );
      }

      return respond(request, env, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error.";
      return respond(request, env, { error: message }, 500);
    }
  },
};
