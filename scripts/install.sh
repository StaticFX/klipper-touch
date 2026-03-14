#!/usr/bin/env bash
# Klipper Touch installer — can be curl-piped on a fresh Raspberry Pi:
#   curl -fsSL https://raw.githubusercontent.com/devin/klipper-touch/main/scripts/install.sh | bash
#
# Environment variables:
#   KLIPPER_TOUCH_VERSION  — release tag to install (default: latest)
#   MOONRAKER_URL          — Moonraker address    (default: http://localhost:7125)
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
REPO="devin/klipper-touch"
GITHUB_API="https://api.github.com/repos/${REPO}"
MOONRAKER_URL="${MOONRAKER_URL:-http://localhost:7125}"
KLIPPER_TOUCH_VERSION="${KLIPPER_TOUCH_VERSION:-}"
SERVICE_NAME="klipper-touch"
CONFIG_DIR="${HOME}/.config/klipper-touch"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ──────────────────────────────────────────────────────────────────
info()    { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
error()   { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; exit 1; }

banner() {
  printf "${BOLD}${CYAN}"
  cat << 'ART'

  ╔═══════════════════════════════════════╗
  ║         Klipper Touch Installer       ║
  ╚═══════════════════════════════════════╝

ART
  printf "${NC}"
}

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "${TMP_DIR}" ]; then
    rm -rf "${TMP_DIR}"
  fi
}
trap cleanup EXIT

# ── Preflight checks ────────────────────────────────────────────────────────
check_system() {
  info "Checking system compatibility..."

  # Must be Linux
  if [ "$(uname -s)" != "Linux" ]; then
    error "This installer only supports Linux (detected: $(uname -s))."
  fi

  # Must be ARM64
  local arch
  arch="$(uname -m)"
  if [ "${arch}" != "aarch64" ] && [ "${arch}" != "arm64" ]; then
    error "This installer only supports ARM64 (detected: ${arch})."
  fi

  # Must be Debian/Ubuntu
  if [ ! -f /etc/os-release ]; then
    error "Cannot detect OS — /etc/os-release not found."
  fi

  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}${ID_LIKE:-}" in
    *debian*|*ubuntu*) ;;
    *) error "Unsupported distribution: ${PRETTY_NAME:-unknown}. Debian/Ubuntu required." ;;
  esac

  success "System OK: ${PRETTY_NAME} (${arch})"
}

# ── Install system dependencies ──────────────────────────────────────────────
install_deps() {
  info "Installing system dependencies..."

  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    libwebkit2gtk-4.1-0 \
    cage \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    fonts-noto-core \
    curl \
    jq \
    2>/dev/null

  success "System dependencies installed."
}

# ── Resolve version ─────────────────────────────────────────────────────────
resolve_version() {
  if [ -n "${KLIPPER_TOUCH_VERSION}" ]; then
    # Ensure tag starts with 'v'
    case "${KLIPPER_TOUCH_VERSION}" in
      v*) ;;
      *)  KLIPPER_TOUCH_VERSION="v${KLIPPER_TOUCH_VERSION}" ;;
    esac
    info "Using requested version: ${KLIPPER_TOUCH_VERSION}"
    return
  fi

  info "Fetching latest release tag..."
  KLIPPER_TOUCH_VERSION="$(
    curl -fsSL "${GITHUB_API}/releases/latest" \
      | jq -r '.tag_name'
  )"

  if [ -z "${KLIPPER_TOUCH_VERSION}" ] || [ "${KLIPPER_TOUCH_VERSION}" = "null" ]; then
    error "Could not determine latest release. Set KLIPPER_TOUCH_VERSION manually."
  fi

  success "Latest version: ${KLIPPER_TOUCH_VERSION}"
}

# ── Download & install .deb ──────────────────────────────────────────────────
install_deb() {
  info "Downloading klipper-touch ${KLIPPER_TOUCH_VERSION}..."

  TMP_DIR="$(mktemp -d)"

  # Find the .deb asset URL from the release
  local asset_url
  asset_url="$(
    curl -fsSL "${GITHUB_API}/releases/tags/${KLIPPER_TOUCH_VERSION}" \
      | jq -r '.assets[] | select(.name | endswith(".deb")) | .browser_download_url' \
      | head -n1
  )"

  if [ -z "${asset_url}" ] || [ "${asset_url}" = "null" ]; then
    error "No .deb asset found for release ${KLIPPER_TOUCH_VERSION}."
  fi

  local deb_file="${TMP_DIR}/klipper-touch.deb"
  curl -fsSL -o "${deb_file}" "${asset_url}"
  success "Downloaded: $(basename "${asset_url}")"

  info "Installing .deb package..."
  sudo dpkg -i "${deb_file}"
  success "Package installed."
}

# ── Create default config ────────────────────────────────────────────────────
create_config() {
  if [ -f "${CONFIG_DIR}/config.toml" ]; then
    info "Config already exists at ${CONFIG_DIR}/config.toml — skipping."
    return
  fi

  info "Creating default config..."
  mkdir -p "${CONFIG_DIR}"

  cat > "${CONFIG_DIR}/config.toml" << TOML
# Klipper Touch configuration

moonraker_url = "${MOONRAKER_URL}"

# Theme: "light" or "dark"
theme = "dark"

# Add custom macros below:
# [[macros]]
# name = "QGL"
# gcode = "QUAD_GANTRY_LEVEL"
# color = "#3b82f6"
# confirm = true
TOML

  success "Config written to ${CONFIG_DIR}/config.toml"
}

# ── Install systemd service ─────────────────────────────────────────────────
install_service() {
  info "Installing systemd service..."

  sudo tee "/etc/systemd/system/${SERVICE_NAME}@.service" > /dev/null << 'UNIT'
[Unit]
Description=Klipper Touch UI
After=moonraker.service network-online.target
Wants=moonraker.service

[Service]
Type=simple
User=%i
Environment=XDG_RUNTIME_DIR=/run/user/%U
Environment=WLR_LIBINPUT_NO_DEVICES=1
ExecStart=/usr/bin/cage -s -- /usr/bin/klipper-touch
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
UNIT

  sudo systemctl daemon-reload
  success "Systemd unit installed: ${SERVICE_NAME}@.service"

  info "Enabling and starting service for user '${USER}'..."
  sudo systemctl enable "${SERVICE_NAME}@${USER}.service"
  sudo systemctl start "${SERVICE_NAME}@${USER}.service"
  success "Service enabled and started."
}

# ── Optionally disable KlipperScreen ────────────────────────────────────────
handle_klipperscreen() {
  if ! systemctl is-active --quiet KlipperScreen 2>/dev/null; then
    return
  fi

  warn "KlipperScreen is currently running."

  # When piped from curl, stdin is the script itself — default to No
  if [ -t 0 ]; then
    printf "${YELLOW}Disable KlipperScreen? [y/N]:${NC} "
    read -r answer
  else
    info "Non-interactive mode detected — skipping KlipperScreen prompt (run manually if needed)."
    return
  fi

  if [[ "${answer:-}" =~ ^[Yy]$ ]]; then
    sudo systemctl stop KlipperScreen
    sudo systemctl disable KlipperScreen
    success "KlipperScreen stopped and disabled."
  else
    info "KlipperScreen left running."
  fi
}

# ── Summary ──────────────────────────────────────────────────────────────────
print_summary() {
  printf "\n${BOLD}${GREEN}"
  cat << 'ART'
  ╔═══════════════════════════════════════╗
  ║       Installation Complete!          ║
  ╚═══════════════════════════════════════╝
ART
  printf "${NC}\n"

  info "Version:  ${KLIPPER_TOUCH_VERSION}"
  info "Config:   ${CONFIG_DIR}/config.toml"
  info "Service:  ${SERVICE_NAME}@${USER}.service"
  printf "\n"
  info "Useful commands:"
  printf "  ${BOLD}sudo systemctl status ${SERVICE_NAME}@${USER}${NC}   — check status\n"
  printf "  ${BOLD}sudo systemctl restart ${SERVICE_NAME}@${USER}${NC}  — restart\n"
  printf "  ${BOLD}journalctl -u ${SERVICE_NAME}@${USER} -f${NC}       — follow logs\n"
  printf "\n"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  banner
  check_system
  install_deps
  resolve_version
  install_deb
  create_config
  install_service
  handle_klipperscreen
  print_summary
}

main "$@"
