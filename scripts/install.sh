#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/klipper-touch"
SERVICE_NAME="klipper-touch"
CONFIG_DIR="$HOME/.config/klipper-touch"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Klipper Touch Installer ==="

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  libwebkit2gtk-4.1-0 \
  cage \
  libgtk-3-0 \
  libayatana-appindicator3-1 \
  fonts-noto-core \
  2>/dev/null

# Create install directory
echo "Installing binary..."
sudo mkdir -p "$INSTALL_DIR"

# Copy binary (assumes it's already built)
if [ -f "$PROJECT_DIR/src-tauri/target/release/klipper-touch" ]; then
  sudo cp "$PROJECT_DIR/src-tauri/target/release/klipper-touch" "$INSTALL_DIR/"
  sudo chmod +x "$INSTALL_DIR/klipper-touch"
elif [ -f "$PROJECT_DIR/src-tauri/target/release/bundle/deb/"*.deb ]; then
  sudo dpkg -i "$PROJECT_DIR/src-tauri/target/release/bundle/deb/"*.deb
else
  echo "ERROR: No built binary found. Run 'bun run tauri build' first."
  exit 1
fi

# Setup config
if [ ! -f "$CONFIG_DIR/config.toml" ]; then
  echo "Creating default config..."
  mkdir -p "$CONFIG_DIR"
  cp "$PROJECT_DIR/config/klipper-touch.example.toml" "$CONFIG_DIR/config.toml"
fi

# Install systemd service
echo "Installing systemd service..."
sudo cp "$SCRIPT_DIR/klipper-touch.service" "/etc/systemd/system/${SERVICE_NAME}@.service"
sudo systemctl daemon-reload

# Enable for current user
sudo systemctl enable "${SERVICE_NAME}@${USER}.service"

# Optionally disable KlipperScreen
if systemctl is-active --quiet KlipperScreen 2>/dev/null; then
  read -rp "KlipperScreen is running. Disable it? [y/N] " answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    sudo systemctl stop KlipperScreen
    sudo systemctl disable KlipperScreen
  fi
fi

echo ""
echo "=== Installation complete ==="
echo "Start with: sudo systemctl start ${SERVICE_NAME}@${USER}"
echo "Config: $CONFIG_DIR/config.toml"
