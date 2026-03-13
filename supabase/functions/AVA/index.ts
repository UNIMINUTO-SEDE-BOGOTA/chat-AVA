import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.info("AVA function started");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.info("📥 Body completo recibido:", JSON.stringify(body));

    // ── Extraer todos los campos relevantes ──────────────────
    const { mensaje, modo, sessionId, proceso, macroproceso, category } = body;

    console.info("📌 mensaje:", mensaje);
    console.info("📌 modo:", modo);
    console.info("📌 sessionId:", sessionId ?? "⚠️ no recibido");
    console.info("📌 proceso:", proceso);
    console.info("📌 macroproceso:", macroproceso);

    // ── Resolver webhook según modo ──────────────────────────
    let webhook = "";
    if (modo === "capacitacion") webhook = Deno.env.get("WEBHOOK_AVA_CAPACITACION") ?? "";
    if (modo === "consulta")     webhook = Deno.env.get("WEBHOOK_AVA_CONSULTA")     ?? "";
    if (modo === "simulador")    webhook = Deno.env.get("WEBHOOK_AVA_SIMULADOR")    ?? "";
    if (modo === "gestion")      webhook = Deno.env.get("WEBHOOK_AVA_GESTION")      ?? "";

    console.info("🔗 Webhook resuelto:", webhook || "⚠️ VACÍO - variable no encontrada");
    console.info("🔍 Todas las vars:", {
      CAPACITACION: Deno.env.get("WEBHOOK_AVA_CAPACITACION") ? "✅ definida" : "❌ ausente",
      CONSULTA:     Deno.env.get("WEBHOOK_AVA_CONSULTA")     ? "✅ definida" : "❌ ausente",
      SIMULADOR:    Deno.env.get("WEBHOOK_AVA_SIMULADOR")    ? "✅ definida" : "❌ ausente",
      GESTION:      Deno.env.get("WEBHOOK_AVA_GESTION")      ? "✅ definida" : "❌ ausente",
    });

    if (!webhook) {
      console.error("❌ No se encontró webhook para modo:", modo);
      return new Response(
        JSON.stringify({ error: "Webhook no configurado", modo }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── Payload completo hacia n8n ───────────────────────────
    const payload = {
      message:     mensaje,
      sessionId:   sessionId ?? "",   // 👈 clave para la memoria de n8n
      proceso:     proceso      ?? "",
      macroproceso: macroproceso ?? "",
      category:    category     ?? modo ?? "",
    };

    console.info("📤 Payload enviado a n8n:", JSON.stringify(payload));

    let response: Response;
    try {
      response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error("🌐 Error de red al hacer fetch:", {
        message: fetchError.message,
        name: fetchError.name,
        cause: fetchError.cause,
      });
      return new Response(
        JSON.stringify({ error: "Error de red", detail: fetchError.message, webhookUrl: webhook }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.info("📬 Respuesta de n8n:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ n8n retornó error:", { status: response.status, body: errorBody });
      return new Response(
        JSON.stringify({ error: "Webhook retornó error", status: response.status, body: errorBody }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await response.json();
    console.info("✅ Resultado exitoso:", JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("💥 Error general:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({ error: "Error en la función", detail: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});