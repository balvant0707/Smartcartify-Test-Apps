// api.rules.jsx — rule saves are now handled by individual campaign routes.
// POST /api/rules returns 410 with guidance.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const action = () =>
  json(
    {
      error:
        "This endpoint is no longer active. Rule saves are handled by the individual campaign routes (/app/rule-shipping, /app/rule-auto-discount, etc.).",
    },
    410
  );

export const loader = () =>
  json({ error: "Use POST to individual rule routes." }, 405);
