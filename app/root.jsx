import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useEffect } from "react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export default function App() {
  useEffect(() => {
    if (typeof window === "undefined" || !("performance" in window)) return;

    const toSeconds = (ms) =>
      typeof ms === "number" ? (ms / 1000).toFixed(2) : "n/a";

    const navEntry = performance.getEntriesByType("navigation")[0];
    const pageOpenMs = navEntry?.loadEventEnd
      ? navEntry.loadEventEnd - navEntry.startTime
      : null;
    const installMs = navEntry?.domInteractive
      ? navEntry.domInteractive - navEntry.startTime
      : null;

    console.log("[Perf] Page open time (s):", toSeconds(pageOpenMs));
    console.log("[Perf] Install time (s):", toSeconds(installMs));

    if (!("PerformanceObserver" in window)) return;

    let lastLcpEntry = null;
    let reported = false;

    const reportLcp = () => {
      if (reported) return;
      reported = true;
      if (!lastLcpEntry) return;
      console.log(
        "[Perf] Largest Contentful Paint (s):",
        toSeconds(lastLcpEntry.startTime),
      );
    };

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      lastLcpEntry = entries[entries.length - 1] || lastLcpEntry;
    });

    observer.observe({ type: "largest-contentful-paint", buffered: true });

    const visibilityHandler = () => {
      if (document.visibilityState === "hidden") reportLcp();
    };

    window.addEventListener("pagehide", reportLcp);
    document.addEventListener("visibilitychange", visibilityHandler);
    const fallbackTimer = setTimeout(reportLcp, 4000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener("pagehide", reportLcp);
      document.removeEventListener("visibilitychange", visibilityHandler);
      observer.disconnect();
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
