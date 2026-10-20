#!/bin/bash
# Remove the Window Padding extension, its settings and the CLI. Windows go
# back to the stock GNOME layout immediately (the extension is disabled first).
# Backups in ~/.config/window-padding-backup are kept.
set -euo pipefail

UUID="window-padding@pvlamkhtn.github.io"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "==> Disabling extension..."
gnome-extensions disable "$UUID" 2>/dev/null || true
current=$(gsettings get org.gnome.shell enabled-extensions)
cleaned=$(echo "$current" | sed "s/, '$UUID'//; s/'$UUID', //; s/'$UUID'//")
[[ "$cleaned" == "[]" ]] && cleaned="@as []"
gsettings set org.gnome.shell enabled-extensions "$cleaned"

echo "==> Removing saved settings..."
dconf reset -f /org/gnome/shell/extensions/window-padding/

echo "==> Removing files..."
rm -rf "$EXT_DIR"
rm -f "$HOME/.local/bin/win-padding"

echo
echo "Done. Backups kept in ~/.config/window-padding-backup (delete manually if you want)."
