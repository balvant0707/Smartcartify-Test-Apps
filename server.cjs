// require('dotenv').config();
// IISNODE RESTART: 2026-03-12T13:17:11.731Z
// const express = require('express');
// const mysql = require('mysql');

// const app = express();
// const port = process.env.PORT || 3306;

// // --- CSP Middleware Add કરો ---
// app.use((req, res, next) => {
//   const csp = [
//     "default-src 'self'",
//     "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
//     "script-src 'self' 'unsafe-inline' https://cdn.shopify.com https://*.shopifycloud.com",
//     "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
//     "img-src 'self' data: https://cdn.shopify.com https://*.shopifycdn.net",
//     "connect-src 'self' https://*.shopifycloud.com https://*.shopifysvc.com https://monorail-edge.shopifysvc.com https://monorail.shopifysvc.com https://admin.shopify.com https://*.myshopify.com https://cdn.shopify.com",
//     "font-src 'self' https://cdn.shopify.com",
//   ].join('; ');

//   res.setHeader('Content-Security-Policy', csp);
//   next();
// });

// // MySQL સાથે કનેક્શન
// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME
// });

// db.connect(err => {
//   if (err) console.error('MySQL connection error:', err);
//   else console.log('Connected to MySQL database');
// });

// app.use(express.json());

// // Home Route
// app.get('/', (req, res) => {
//   res.send('Hello! Node.js + MySQL + Ngrok template is running.');
// });

// // Table થી data લાવવા માટે
// app.get('/data/:table', (req, res) => {
//   const table = req.params.table;
//   db.query(`SELECT * FROM \`${table}\``, (err, results) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(results);
//   });
// });

// // Table માં data insert કરવા માટે
// app.post('/data/:table', (req, res) => {
//   const table = req.params.table;
//   const data = req.body; // Example: { column1: "value1", column2: "value2" }
//   db.query(`INSERT INTO \`${table}\` SET ?`, data, (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ insertedId: result.insertId });
//   });
// });

// // Server start
// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

// server.js
// server.cjs — Remix + Express (CJS) for Windows/IIS (Plesk)
// server.cjs — Remix + Express (CJS) for Windows/IIS (Plesk)
try { require("dotenv").config(); } catch {}

const path = require("node:path");
const fs = require("node:fs");
const childProcess = require("node:child_process");
const express = require("express");
const appRoot = __dirname;

const runStartupTask = (label, file, args) => {
  try {
    childProcess.execFileSync(file, args, {
      cwd: appRoot,
      env: process.env,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(`[startup] ${label} failed`, error);
    process.exit(1);
  }
};

const runStartupDatabaseTasks = () => {
  if (process.env.SKIP_STARTUP_DB_TASKS === "true") {
    return;
  }

  const bootstrapScript = path.join(appRoot, "scripts", "bootstrap-shop-schema.mjs");
  if (fs.existsSync(bootstrapScript)) {
    runStartupTask("shop bootstrap", process.execPath, [bootstrapScript]);
  }

  const prismaBin = path.join(
    appRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma",
  );

  if (fs.existsSync(prismaBin)) {
    runStartupTask("prisma migrate deploy", prismaBin, ["migrate", "deploy"]);
  }
};

// ---- Optional middlewares (safe import) ----
let compressionMw = (_r,_s,next)=>next();
try { compressionMw = require("compression")(); } catch {}

let morganMw = (_r,_s,next)=>next();
try { morganMw = require("morgan")("tiny"); } catch {}

let createRequestHandler = null;
try { createRequestHandler = require("@react-router/express").createRequestHandler; } catch {}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
runStartupDatabaseTasks();

// Allow Shopify to iframe the app; avoid X-Frame-Options blocking.
app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com https://checkout.shopify.com"
  );
  next();
});

// -----------------------------------------------------
// 🔍 Health / Debug / Ping
// -----------------------------------------------------
app.get("/healthz", (_req, res) => res.status(200).send("OK"));
app.get("/ping", (_req, res) => res.type("text").send("pong"));

// -----------------------------------------------------
// 📁 Static assets
// -----------------------------------------------------
// /public first
const publicDir = path.join(appRoot, "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: "1h" }));
}

// mount ALL build dirs at /build (falls through if not found)
["public/build", "build/client", "build"].forEach(rel => {
  const full = path.join(appRoot, rel);
  if (fs.existsSync(full)) {
    app.use("/build", express.static(full, { immutable: true, maxAge: "1y" }));
  }
});

// -----------------------------------------------------
// 🎨 Polaris CSS without import
//  - /polaris.css
//  - fallback for /assets/styles-*.css and /build/assets/styles-*.css
// -----------------------------------------------------
let polarisCssPath = null;
try {
  polarisCssPath = require.resolve("@shopify/polaris/build/esm/styles.css");
} catch (e) {
  console.error("Polaris CSS not found. Install @shopify/polaris.", e);
}
function sendPolarisCss(req, res) {
  if (!polarisCssPath) return res.status(404).send("polaris.css not found");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.type("text/css");
  res.sendFile(polarisCssPath);
}
app.get("/polaris.css", sendPolarisCss);
// direct aliases for your failing paths
app.get("/assets/styles-:hash.css", sendPolarisCss);
app.get("/build/assets/styles-:hash.css", sendPolarisCss);

// -----------------------------------------------------
// 🧠 Smart asset resolver for JS/CSS (covers /build/assets/*, /build/_assets/*, /assets/*)
// Searches common locations and serves the first match.
// -----------------------------------------------------
const ASSET_SEARCH_DIRS = [
  path.join(appRoot, "public", "build", "assets"),
  path.join(appRoot, "build", "client", "assets"),
  path.join(appRoot, "build", "assets"),
  path.join(appRoot, "build", "server", "assets"), // last resort
];

function findAsset(assetRelName) {
  // basic sanitization (filenames like components-*.js, styles-*.css)
  if (!/^[A-Za-z0-9._\-\/]+$/.test(assetRelName)) return null;
  for (const base of ASSET_SEARCH_DIRS) {
    const abs = path.join(base, assetRelName);
    if (abs.startsWith(base) && fs.existsSync(abs)) return abs;
  }
  return null;
}

function assetHandler(req, res) {
  const name = req.params.file || "";
  const found = findAsset(name);
  if (found) {
    const ext = path.extname(found).toLowerCase();
    if (ext === ".css") res.type("text/css");
    if (ext === ".js")  res.type("application/javascript");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(found);
  }
  // final fallback: if it *looks* like the main styles-*.css, send Polaris CSS
  if (/^styles-.*\.css$/i.test(path.basename(name))) return sendPolarisCss(req, res);
  return res.status(404).send("asset not found");
}

// wildcard routes
app.get("/build/assets/:file(*)", assetHandler);
app.get("/build/_assets/:file(*)", assetHandler);
app.get("/assets/:file(*)", assetHandler);

// -----------------------------------------------------
// (Optional) auto-inject Polaris CSS link into HTML
// -----------------------------------------------------
app.use((req, res, next) => {
  const oldSend = res.send;
  res.send = function (body) {
    try {
      if (typeof body === "string" && body.includes("</head>") && !body.includes('/polaris.css')) {
        body = body.replace(
          "</head>",
          '<link rel="stylesheet" href="/polaris.css"></head>'
        );
      }
    } catch {}
    return oldSend.call(this, body);
  };
  next();
});

// -----------------------------------------------------
// 🧩 Middlewares
// -----------------------------------------------------
app.use(compressionMw);
app.use(morganMw);

// -----------------------------------------------------
// ⚙️ Load Remix server build (supports .cjs or .js)
// -----------------------------------------------------
const BUILD_CANDIDATES = [
  path.join(appRoot, "build", "server", "index.cjs"),
  path.join(appRoot, "build", "server", "index.js"),
];
let BUILD_PATH = BUILD_CANDIDATES.find(p => fs.existsSync(p));
let BUILD = null, buildErr = null, buildExists = Boolean(BUILD_PATH);

try {
  if (buildExists) {
    BUILD = require(BUILD_PATH);
    if (BUILD && BUILD.default) BUILD = BUILD.default;
  }
} catch (e) { buildErr = e; }

// tiny helper for __fs
const dirList = (p) => { try { return fs.readdirSync(p); } catch { return "(cannot read)"; } };

// Debug probes - only available in non-production environments
if (process.env.NODE_ENV !== "production") {
  app.get("/__build", (_req, res) => {
    res.status(200).json({
      buildExists,
      loaded: !!BUILD,
      BUILD_PATH: BUILD_PATH || "(not found)",
      error: buildErr ? String(buildErr.stack || buildErr) : null
    });
  });
  app.get("/__fs", (_req, res) => {
    const root = __dirname;
    res.status(200).json({
      root,
      exists: {
        "build/": fs.existsSync(path.join(root, "build")),
        "build/server/": fs.existsSync(path.join(root, "build", "server")),
        "build/server/index.cjs": fs.existsSync(path.join(root, "build", "server", "index.cjs")),
        "build/server/index.js": fs.existsSync(path.join(root, "build", "server", "index.js")),
        "public/build/": fs.existsSync(path.join(root, "public", "build")),
        "node_modules/": fs.existsSync(path.join(root, "node_modules")),
      },
      list: {
        "build/": dirList(path.join(root, "build")),
        "build/server/": dirList(path.join(root, "build", "server")),
        "public/build/": dirList(path.join(root, "public", "build")),
      }
    });
  });
}

// -----------------------------------------------------
// 🚦 Remix handler / fallback
// -----------------------------------------------------
if (BUILD && createRequestHandler) {
  app.all("*", createRequestHandler({
    build: BUILD,
    mode: process.env.NODE_ENV || "production",
  }));
} else {
  app.all("*", (_req, res) => {
    const msg = [
      "❌ Remix server build not available.",
      "",
      "Tried:", ...BUILD_CANDIDATES.map(p => ` - ${p}`),
      "", `Chosen BUILD_PATH: ${BUILD_PATH || "(none found)"}`,
      "",
      "Fix steps:",
      "1) On your dev machine: `npm ci && npm run build`",
      "2) Upload /build and /public/build to the app root",
      "3) On the server: `npm ci`",
      "4) Plesk → Node.js → Restart App",
      "",
      "Detail:", buildErr ? String(buildErr.stack || buildErr) : "(no stack)"
    ].join("\n");
    res.status(500).type("text/plain").send(msg);
  });
}

// -----------------------------------------------------
// ⚠️ Error visibility
// -----------------------------------------------------
process.on("unhandledRejection", err => console.error("UNHANDLED REJECTION", err));
process.on("uncaughtException", err => console.error("UNCAUGHT EXCEPTION", err));

// -----------------------------------------------------
// 🚀 Start
// -----------------------------------------------------
const port = process.env.PORT;
if (!port) {
  console.error("❌ process.env.PORT missing. Set it in Plesk → Node.js → Environment variables (e.g., 3000).");
} else {
  app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
}
