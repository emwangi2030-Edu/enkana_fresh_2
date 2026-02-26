/**
 * Kill any process on the dev server port, then start npm run dev in the background.
 * Run from Farm-Fresh-Meats: node scripts/restart-dev.js
 * Uses PORT from env or 5000.
 */
import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
// Dev server may use PORT from env; kill both common ports so restart always clears the way
const portsToKill = [process.env.PORT || "5000", "5001"];

function killPort(p) {
  try {
    if (process.platform === "win32") {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${p}" ^| find "LISTENING"') do taskkill /F /PID %a`, {
        stdio: "ignore",
        shell: true,
      });
    } else {
      execSync(`lsof -ti:${p} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
    }
  } catch {
    // No process on port or already dead
  }
}

[...new Set(portsToKill)].forEach(killPort);
console.log("Restarting dev server...");

const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
