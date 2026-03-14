#!/usr/bin/env bash
# Klipper Touch installer — run on a Raspberry Pi:
#   curl -fsSL https://raw.githubusercontent.com/StaticFX/klipper-touch/master/scripts/install.sh | bash
#
# Requires: Raspberry Pi OS Bookworm (Debian 12) or newer, ARM64
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

  # Check Debian version — need Bookworm (12) or newer for libwebkit2gtk-4.1
  local version_id="${VERSION_ID:-0}"
  if [ "${version_id}" -lt 12 ] 2>/dev/null; then
    error "Debian ${version_id} (${VERSION_CODENAME:-}) is too old. Klipper Touch requires Bookworm (Debian 12) or newer for libwebkit2gtk-4.1. Please upgrade your Raspberry Pi OS."
  fi

  success "System OK: ${PRETTY_NAME} (${arch})"
}

# ── Install minimal tools needed for the script itself ───────────────────────
install_script_deps() {
  for cmd in curl jq; do
    if ! command -v "${cmd}" &>/dev/null; then
      info "Installing ${cmd}..."
      sudo apt-get update -qq
      sudo apt-get install -y -qq curl jq
      break
    fi
  done
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
    error "No releases found at github.com/${REPO}. Create a release by pushing a v* tag."
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
    error "No .deb package found in release ${KLIPPER_TOUCH_VERSION}."
  fi

  local deb_file="${TMP_DIR}/klipper-touch.deb"
  curl -fsSL -o "${deb_file}" "${asset_url}" || \
    error "Failed to download .deb from ${asset_url}"
  success "Downloaded $(basename "${asset_url}")"

  info "Installing package (apt will pull runtime dependencies)..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq --allow-downgrades "${deb_file}"
  success "Package installed."
}

# ── Install cage (kiosk compositor) ──────────────────────────────────────────
install_cage() {
  if command -v cage &>/dev/null; then
    success "Cage already installed."
    return
  fi

  info "Installing cage (Wayland kiosk compositor)..."
  sudo apt-get install -y -qq cage
  success "Cage installed."
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
theme = "light"

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

  # Find the binary
  local bin_path=""
  for p in /usr/bin/klipper-touch /opt/klipper-touch/klipper-touch; do
    if [ -f "${p}" ]; then
      bin_path="${p}"
      break
    fi
  done

  if [ -z "${bin_path}" ]; then
    # dpkg might put it somewhere else — find it
    bin_path="$(dpkg -L klipper-touch 2>/dev/null | grep '/klipper-touch$' | head -n1)" || true
    if [ -z "${bin_path}" ]; then
      bin_path="/usr/bin/klipper-touch"
      warn "Could not locate binary, assuming ${bin_path}"
    fi
  fi

  sudo tee "/etc/systemd/system/${SERVICE_NAME}@.service" > /dev/null << UNIT
[Unit]
Description=Klipper Touch UI
After=moonraker.service network-online.target seatd.service
Wants=moonraker.service
Requires=seatd.service

[Service]
Type=simple
User=%i
PAMName=login
TTYPath=/dev/tty7
Environment=XDG_RUNTIME_DIR=/run/user/%U
Environment=WLR_DRM_NO_MODIFIERS=1
Environment=WLR_RENDERER=gles2
Environment=WEBKIT_FORCE_SANDBOX=0
ExecStartPre=+/bin/mkdir -p /run/user/%U
ExecStartPre=+/bin/chown %i:%i /run/user/%U
ExecStartPre=+/bin/chmod 700 /run/user/%U
ExecStart=/usr/bin/cage -s -- ${bin_path}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
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

# ── Start service ────────────────────────────────────────────────────────────
start_service() {
  info "Starting Klipper Touch..."
  sudo systemctl restart "${SERVICE_NAME}@${USER}.service"
  success "Service started."
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
  install_script_deps
  resolve_version
  install_deb
  install_cage
  create_config
  install_service
  handle_klipperscreen
  start_service
  print_summary
}

main "$@"
