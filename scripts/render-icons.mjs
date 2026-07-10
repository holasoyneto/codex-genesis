// Render build/icon.svg → PNGs at every size we need, then assemble:
//   - macOS AppIcon.icns (via iconutil)
//   - iOS AppIcon-512@2x.png (1024, no alpha — App Store requires opaque)
//   - dist/icon.svg stays the web/PWA source
// Uses the Chrome already on this machine via puppeteer-core. Fully offline.
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const svg = readFileSync(resolve(ROOT, "build/icon.svg"), "utf8");
const b64 = Buffer.from(svg).toString("base64");

async function png(size, transparent) {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    const bg = transparent ? "transparent" : "#04060d";
    await page.setContent(
      `<!doctype html><meta charset=utf8><style>html,body{margin:0;padding:0;background:${bg}}
       img{display:block;width:${size}px;height:${size}px}</style>
       <img src="data:image/svg+xml;base64,${b64}">`,
      { waitUntil: "networkidle0" }
    );
    const buf = await page.screenshot({ type: "png", omitBackground: transparent });
    return buf;
  } finally { await browser.close(); }
}

// --- macOS .icns ---
const iconset = resolve(ROOT, "build/AppIcon.iconset");
rmSync(iconset, { recursive: true, force: true });
mkdirSync(iconset, { recursive: true });
const macSizes = [
  [16, "icon_16x16.png"], [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"], [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"], [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"], [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"], [1024, "icon_512x512@2x.png"],
];
for (const [size, name] of macSizes) {
  writeFileSync(resolve(iconset, name), await png(size, true));
  console.log("mac", name);
}
execFileSync("iconutil", ["-c", "icns", iconset, "-o", resolve(ROOT, "build/icon.icns")]);
console.log("→ build/icon.icns");

// --- iOS AppIcon (opaque 1024) ---
const iosPng = resolve(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
writeFileSync(iosPng, await png(1024, false));
console.log("→", iosPng);

// --- web/PWA + Electron png ---
writeFileSync(resolve(ROOT, "build/icon-1024.png"), await png(1024, false));
writeFileSync(resolve(ROOT, "public/apple-touch-icon.png"), await png(180, false));
console.log("→ build/icon-1024.png, public/apple-touch-icon.png");
