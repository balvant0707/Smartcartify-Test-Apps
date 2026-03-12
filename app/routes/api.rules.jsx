import { action as rulesAction } from "./app.rules.jsx";

export const action = rulesAction;

export const loader = () =>
  new Response(
    JSON.stringify({
      error: "Use POST /api/rules",
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
