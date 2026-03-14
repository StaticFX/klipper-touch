#!/usr/bin/env bash
# Klipper Touch installer — run on a Raspberry Pi:
#   curl -fsSL https://raw.githubusercontent.com/StaticFX/klipper-touch/master/scripts/install.sh | bash
#
# Environment variables:
#   MOONRAKER_URL          — Moonraker address    (default: http://localhost:7125)
#   KLIPPER_TOUCH_VERSION  — release tag to install (default: latest)
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
REPO="StaticFX/klipper-touch"
GITHUB_API="https://api.github.com/repos/${REPO}"
MOONRAKER_URL="${MOONRAKER_URL:-http://localhost:7125}"
KLIPPER_TOUCH_VERSION="${KLIPPER_TOUCH_VERSION:-}"
INSTALL_DIR="/opt/klipper-touch"
SERVICE_NAME="klipper-touch"
CONFIG_DIR="${HOME}/.config/klipper-touch"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

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

  if [ "$(uname -s)" != "Linux" ]; then
    error "This installer only supports Linux (detected: $(uname -s))."
  fi

  local arch
  arch="$(uname -m)"
  if [ "${arch}" != "aarch64" ] && [ "${arch}" != "arm64" ]; then
    error "This installer only supports ARM64 (detected: ${arch})."
  fi

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

# ── Install runtime dependencies ─────────────────────────────────────────────
install_deps() {
  info "Installing runtime dependencies..."

  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    libwebkit2gtk-4.1-0 \
    cage \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    fonts-noto-core \
    curl \
    jq

  success "Dependencies installed."
}

# ── Resolve version ─────────────────────────────────────────────────────────
resolve_version() {
  if [ -n "${KLIPPER_TOUCH_VERSION}" ]; then
    case "${KLIPPER_TOUCH_VERSION}" in
      v*) ;;
      *)  KLIPPER_TOUCH_VERSION="v${KLIPPER_TOUCH_VERSION}" ;;
    esac
    info "Using requested version: ${KLIPPER_TOUCH_VERSION}"
    return
  fi

  info "Fetching latest release..."
  local response
  response="$(curl -fsSL "${GITHUB_API}/releases/latest" 2>/dev/null)" || \
    error "Failed to reach GitHub API. Check your internet connection."

  KLIPPER_TOUCH_VERSION="$(echo "${response}" | jq -r '.tag_name')"

  if [ -z "${KLIPPER_TOUCH_VERSION}" ] || [ "${KLIPPER_TOUCH_VERSION}" = "null" ]; then
    error "No releases found at github.com/${REPO}. Ask the maintainer to create a release first."
  fi

  success "Latest version: ${KLIPPER_TOUCH_VERSION}"
}

# ── Download & install .deb ──────────────────────────────────────────────────
install_deb() {
  info "Downloading klipper-touch ${KLIPPER_TOUCH_VERSION}..."

  TMP_DIR="$(mktemp -d)"

  local release_json
  release_json="$(curl -fsSL "${GITHUB_API}/releases/tags/${KLIPPER_TOUCH_VERSION}" 2>/dev/null)" || \
    error "Failed to fetch release ${KLIPPER_TOUCH_VERSION} from GitHub."

  local asset_url
  asset_url="$(echo "${release_json}" | jq -r '.assets[] | select(.name | endswith(".deb")) | .browser_download_url' | head -n1)"

  if [ -z "${asset_url}" ] || [ "${asset_url}" = "null" ]; then
    error "No .deb package found in release ${KLIPPER_TOUCH_VERSION}. Available assets: $(echo "${release_json}" | jq -r '.assets[].name' | tr '\n' ', ')"
  fi

  local deb_file="${TMP_DIR}/klipper-touch.deb"
  info "Downloading $(basename "${asset_url}")..."
  curl -fsSL -o "${deb_file}" "${asset_url}" || \
    error "Failed to download .deb from ${asset_url}"

  success "Downloaded."

  info "Installing package..."
  sudo dpkg -i "${deb_file}" || {
    warn "dpkg reported issues, attempting to fix dependencies..."
    sudo apt-get install -f -y
  }

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

  # Find the binary — dpkg puts it in /usr/bin, fallback to /opt
  local bin_path="/usr/bin/klipper-touch"
  if [ ! -f "${bin_path}" ]; then
    bin_path="${INSTALL_DIR}/klipper-touch"
  fi

  sudo tee "/etc/systemd/system/${SERVICE_NAME}@.service" > /dev/null << UNIT
[Unit]
Description=Klipper Touch UI
After=moonraker.service network-online.target
Wants=moonraker.service

[Service]
Type=simple
User=%i
Environment=XDG_RUNTIME_DIR=/run/user/%U
Environment=WLR_LIBINPUT_NO_DEVICES=1
ExecStart=/usr/bin/cage -s -- ${bin_path}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
UNIT

  sudo systemctl daemon-reload
  sudo systemctl enable "${SERVICE_NAME}@${USER}.service"
  success "Service installed and enabled."
}

# ── Optionally disable KlipperScreen ────────────────────────────────────────
handle_klipperscreen() {
  if ! systemctl is-active --quiet KlipperScreen 2>/dev/null; then
    return
  fi

  warn "KlipperScreen is currently running."

  if [ -t 0 ]; then
    printf "${YELLOW}Disable KlipperScreen? [y/N]:${NC} "
    read -r answer
  else
    info "Non-interactive mode — skipping. Disable manually if needed."
    return
  fi

  if [[ "${answer:-}" =~ ^[Yy]$ ]]; then
    sudo systemctl stop KlipperScreen
    sudo systemctl disable KlipperScreen
    success "KlipperScreen stopped and disabled."
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
  info "Start now with:"
  printf "  ${BOLD}sudo systemctl start ${SERVICE_NAME}@${USER}${NC}\n"
  printf "\n"
  info "Other commands:"
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
