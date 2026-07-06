import type { CapacitorConfig } from "@capacitor/cli";

// The native skin (iOS via Capacitor). The web build is the app; this
// config only wraps it. `npm run build && npx cap sync` refreshes the
// shell; `npx cap open ios` opens the Xcode project.
const config: CapacitorConfig = {
  appId: "com.codex.genesis",
  appName: "CODEX",
  webDir: "dist",
  backgroundColor: "#05080f", // --bg, dark cathedral
  ios: {
    contentInset: "never", // the shell owns space; safe areas via env()
  },
};

export default config;
