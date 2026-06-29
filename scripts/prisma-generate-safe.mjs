import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(appRoot, "node_modules", ".prisma", "client");
const clientIndex = path.join(clientDir, "index.js");
const windowsEngine = path.join(clientDir, "query_engine-windows.dll.node");

const hasGeneratedClient = () =>
  fs.existsSync(clientIndex) &&
  (process.platform !== "win32" || fs.existsSync(windowsEngine));

const prismaCli = path.join(appRoot, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  cwd: appRoot,
  env: process.env,
  encoding: "utf8",
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const isLockedWindowsEngine =
  process.platform === "win32" &&
  output.includes("EPERM: operation not permitted, rename") &&
  output.includes("query_engine-windows.dll.node");

if (isLockedWindowsEngine && hasGeneratedClient()) {
  console.warn(
    [
      "[prisma-generate-safe] Prisma could not replace the Windows query engine DLL.",
      "[prisma-generate-safe] An existing generated Prisma client is present, so continuing setup.",
      "[prisma-generate-safe] To refresh the client after schema changes, stop the hosted Node app/IIS worker and run `npx prisma generate` again.",
    ].join("\n"),
  );
  process.exit(0);
}

process.exit(result.status || 1);
