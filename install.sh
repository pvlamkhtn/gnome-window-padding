#!/bin/bash
# Install the Window Padding GNOME Shell extension + the `win-padding` CLI.
# Only adds this extension to your enabled-extensions list; nothing else in
# your GNOME / Tiling Shell config is touched. Safe to re-run (idempotent),
# re-running also updates the installed copy after you edit the source.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UUID="window-padding@pvlamkhtn.github.io"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
BIN_DIR="$HOME/.local/bin"
BACKUP_DIR="$HOME/.config/window-padding-backup"

mkdir -p "$EXT_DIR" "$BIN_DIR" "$BACKUP_DIR"

echo "==> Backing up enabled-extensions list..."
TS=$(date +%Y%m%d-%H%M%S)
echo "gsettings set org.gnome.shell enabled-extensions \"$(gsettings get org.gnome.shell enabled-extensions)\"" \
  > "$BACKUP_DIR/restore-enabled-extensions-$TS.sh"
echo "    Backup saved to $BACKUP_DIR"

# Early builds used a different UUID; running both copies would double the
# padding, so remove the old one. Settings are shared (same dconf path).
LEGACY_UUID="window-padding@mtools.local"
if [[ -d "$HOME/.local/share/gnome-shell/extensions/$LEGACY_UUID" ]]; then
  echo "==> Removing old copy installed as $LEGACY_UUID..."
  gnome-extensions disable "$LEGACY_UUID" 2>/dev/null || true
  current=$(gsettings get org.gnome.shell enabled-extensions)
  cleaned=$(echo "$current" | sed "s/, '$LEGACY_UUID'//; s/'$LEGACY_UUID', //; s/'$LEGACY_UUID'//")
  [[ "$cleaned" == "[]" ]] && cleaned="@as []"
  gsettings set org.gnome.shell enabled-extensions "$cleaned"
  rm -rf "$HOME/.local/share/gnome-shell/extensions/$LEGACY_UUID"
fi

echo "==> Installing extension to $EXT_DIR..."
rm -rf "$EXT_DIR"
cp -r "$PROJECT_DIR/extension" "$EXT_DIR"
glib-compile-schemas "$EXT_DIR/schemas"

echo "==> Installing win-padding CLI to $BIN_DIR..."
install -m 755 "$PROJECT_DIR/bin/win-padding" "$BIN_DIR/win-padding"

echo "==> Enabling extension..."
if gnome-extensions info "$UUID" >/dev/null 2>&1; then
  # Shell already knows it (re-install): reload so the new code is used.
  gnome-extensions disable "$UUID" || true
  gnome-extensions enable "$UUID"
  NEEDS_RELOGIN=false
else
  # Fresh install on Wayland: the shell only scans for new extensions at
  # login, so just mark it enabled for the next session.
  current=$(gsettings get org.gnome.shell enabled-extensions)
  if [[ "$current" != *"'$UUID'"* ]]; then
    if [[ "$current" == "@as []" || "$current" == "[]" ]]; then
      gsettings set org.gnome.shell enabled-extensions "['$UUID']"
    else
      gsettings set org.gnome.shell enabled-extensions "${current%]}, '$UUID']"
    fi
  fi
  NEEDS_RELOGIN=true
fi

echo
echo "Done."
if [[ "$NEEDS_RELOGIN" == "true" ]]; then
  echo "Log out and log back in ONCE so GNOME Shell loads the new extension."
fi
echo "Tune it with:  win-padding set 12   |   win-padding off   |   win-padding prefs"
echo "To undo everything: $PROJECT_DIR/uninstall.sh"
