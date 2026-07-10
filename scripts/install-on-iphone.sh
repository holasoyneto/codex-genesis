#!/bin/bash
# Build CODEX and install it on the connected iPhone — no Xcode GUI needed.
#
# ONE-TIME PREREQUISITE (only if it fails with "No Account for Team"):
#   Open Xcode  →  Settings… (⌘,)  →  Accounts  →  "+"  →  Apple ID  →
#   sign in as  mandragoraneto@icloud.com  (team 26WV4W7VV2).
#   That's the only step that needs your password. Then re-run this script.
#
set -e
cd "$(dirname "$0")/.."

DEVICE="0F2A406A-88DD-5961-9671-11FD44D7A6EB"   # iPhone 17 Pro Max
APP="ios/App/build/Build/Products/Debug-iphoneos/App.app"

echo "→ Syncing web build into iOS…"
npx cap sync ios

echo "→ Building for the iPhone (auto-provisioning)…"
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination "id=$DEVICE" \
  -derivedDataPath ios/App/build \
  -allowProvisioningUpdates \
  build

echo "→ Installing onto the iPhone…"
xcrun devicectl device install app --device "$DEVICE" "$APP"

echo "✓ Done. CODEX is on your iPhone — tap to open. Trust the developer under"
echo "  Settings → General → VPN & Device Management if it asks on first launch."
