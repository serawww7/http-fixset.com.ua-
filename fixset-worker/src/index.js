const ALLOWED_ORIGINS = [
  "https://fixset.com.ua",
  "https://www.fixset.com.ua",
];

const TASK_NAME = "Новий лід із сайту FIXSET";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return handleOptions(corsHeaders);
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ status: "ok" }, 200, corsHeaders);
    }

    if (request.method === "POST" && url.pathname === "/lead") {
      return handleLead(request, env, corsHeaders);
    }

    return json({ success: false, error: "Not found" }, 404, corsHeaders);
  },
};

function buildCorsHeaders(origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function handleOptions(corsHeaders) {
  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Max-Age": "86400",
    },
  });
}

async function handleLead(request, env, corsHeaders) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400, corsHeaders);
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return json({ success: false, error: "phone is required" }, 400, corsHeaders);
  }

  const source = typeof body.source === "string" ? body.source.trim() : "";
  const site =
    typeof body.site === "string" && body.site.trim()
      ? body.site.trim()
      : "fixset.com.ua";

  const contactMethodLabels = {
    phone: "Дзвінок",
    viber: "Viber",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
  };
  const contactMethodRaw =
    typeof body.contact_method === "string" ? body.contact_method.trim() : "";
  const contact_method =
    contactMethodLabels[contactMethodRaw] || contactMethodLabels.phone;

  const date = formatDate(new Date());
  const ip = getClientIp(request);
  const userAgent = request.headers.get("User-Agent") || "";

  const description = [
    "Телефон:",
    phone,
    "Спосіб зв'язку:",
    contact_method,
    "Сайт:",
    site,
    "Source:",
    source,
    "Дата:",
    date,
    "IP:",
    ip,
    "User-Agent:",
    userAgent,
  ].join("\n");

  try {
    const planfixResponse = await createPlanfixTask(env, description);
    const planfixData = await planfixResponse.json().catch(() => null);

    if (!planfixResponse.ok || planfixData?.result !== "success") {
      return json(
        {
          success: false,
          error: planfixData?.error || planfixData || "Planfix request failed",
        },
        502,
        corsHeaders,
      );
    }

    return json({ success: true }, 200, corsHeaders);
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      502,
      corsHeaders,
    );
  }
}

async function createPlanfixTask(env, description) {
  const url = env.PLANFIX_URL.replace(/\/?$/, "/") + "task/";

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PLANFIX_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: TASK_NAME,
      description,
    }),
  });
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    ""
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function json(data, status, corsHeaders = {}) {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}
