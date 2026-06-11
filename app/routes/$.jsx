import { Link } from "react-router";

export const loader = () => new Response(null, { status: 404 });

export default function NotFound() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "32px",
      background: "#f6f6f7",
      color: "#202223",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <section style={{
        width: "100%",
        maxWidth: "560px",
        padding: "32px",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
      }}>
        <p style={{
          margin: "0 0 8px",
          color: "#6d7175",
          fontSize: "14px",
          fontWeight: 600,
        }}>
          404
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "28px", lineHeight: 1.2 }}>
          Page not found
        </h1>
        <p style={{ margin: "0 0 24px", color: "#6d7175", lineHeight: 1.5 }}>
          This app page does not exist. If you are trying to manage CartLift,
          open the app from your Shopify admin.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: "36px",
            padding: "0 14px",
            borderRadius: "6px",
            background: "#008060",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to app login
        </Link>
      </section>
    </main>
  );
}
