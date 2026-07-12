import { cpSync, existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const standaloneRoot = resolve(".next/standalone");
const staticSource = resolve(".next/static");
const staticTarget = resolve(standaloneRoot, ".next/static");

if (!existsSync(resolve(standaloneRoot, "server.js"))) {
  throw new Error("Run `npm run build` before starting the standalone test server.");
}

mkdirSync(resolve(standaloneRoot, ".next"), { recursive: true });
cpSync(staticSource, staticTarget, { recursive: true, force: true });
if (existsSync(resolve("public"))) {
  cpSync(resolve("public"), resolve(standaloneRoot, "public"), {
    recursive: true,
    force: true,
  });
}

await import(pathToFileURL(resolve(standaloneRoot, "server.js")).href);
