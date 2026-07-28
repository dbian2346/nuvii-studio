const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
      return respond(request, env, { ok: true, service: "nuvii-ai-generator" });
    }

    if (url.pathname !== "/generate" || request.method !== "POST") {
      return respond(request, env, { error: "Not found." }, 404);
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

      const shape = typeof body.shape === "string" ? body.shape : "almond";
      const length = typeof body.length === "string" ? body.length : "medium";
      const baseColor = typeof body.baseColor === "string" ? body.baseColor : "milky nude";

      const enhancedPrompt = [
        "Create a flat, front-facing 2D nail-art texture for a digital press-on nail editor.",
        `Requested design: ${userPrompt}.`,
        `The editor will mask the artwork into a ${length} ${shape} press-on nail with base colour ${baseColor}.`,
        "Generate only the decorative surface artwork: colours, gradients, painted motifs, chrome lines, glitter, gems or raised gel details requested by the user.",
        "Fill the canvas edge-to-edge with a centered vertical composition suitable for a narrow 5:9 nail mask.",
        "This must look like a clean digital nail-art texture, not a photograph or product scene.",
        "ABSOLUTELY NO hand, finger, thumb, skin, cuticle, human anatomy, physical nail tip, detached nail product, manicure tools, bottle, table, room, background objects, text, letters, logo, watermark or frame.",
        "Do not draw an outer nail silhouette; the application adds the exact press-on nail shape and transparent boundary after generation.",
        "Keep all important details inside the central vertical area and use polished, modern editorial nail-art styling.",
      ].join(" ");

      const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: enhancedPrompt,
        steps: 4,
        seed: Math.floor(Math.random() * 2147483647),
      });

      if (!result || typeof result.image !== "string") {
        return respond(request, env, { error: "The image model returned an unexpected response." }, 502);
      }

      return respond(request, env, {
        dataURI: `data:image/jpeg;base64,${result.image}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error.";
      return respond(request, env, { error: message }, 500);
    }
  },
};
