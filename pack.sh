#!/bin/bash
# Build the zip to upload to extensions.gnome.org. It contains only what the
# extension needs at runtime (no install scripts, no CLI), as the review
# guidelines require. Output: release/<uuid>.shell-extension.zip
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$PROJECT_DIR/release"
mkdir -p "$OUT_DIR"

gnome-extensions pack "$PROJECT_DIR/extension" --force --out-dir="$OUT_DIR"

ZIP=$(ls "$OUT_DIR"/*.shell-extension.zip)
echo "Built: $ZIP"
unzip -l "$ZIP"
