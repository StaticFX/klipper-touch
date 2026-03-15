#!/usr/bin/env bash
# Build Klipper Touch directly on a Raspberry Pi
# Usage: curl -fsSL https://raw.githubusercontent.com/StaticFX/klipper-touch/master/scripts/build-on-pi.sh | bash
set -euo pipefail

REPO="StaticFX/klipper-touch"
BUILD_DIR="${HOME}/klipper-touch-build"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
error()   { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; exit 1; }

# ── Install build dependencies ──────────────────────────────────────────────
install_deps() {
  info "Installing build dependencies..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    build-essential pkg-config \
    curl git unzip
  success "Build dependencies installed."
}

# ── Install Rust ─────────────────────────────────────────────────────────────
install_rust() {
  if command -v rustc &>/dev/null; then
    success "Rust already installed: $(rustc --version)"
    return
  fi

  info "Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck disable=SC1091
  source "${HOME}/.cargo/env"
  success "Rust installed: $(rustc --version)"
}

# ── Install Bun ──────────────────────────────────────────────────────────────
install_bun() {
  if command -v bun &>/dev/null; then
    success "Bun already installed: $(bun --version)"
    return
  fi

  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
  success "Bun installed: $(bun --version)"
}

# ── Clone / update repo ─────────────────────────────────────────────────────
prepare_source() {
  if [ -d "${BUILD_DIR}/.git" ]; then
    info "Updating existing source..."
    cd "${BUILD_DIR}"
    git fetch origin
    git reset --hard origin/master
  else
    info "Cloning repository..."
    git clone "https://github.com/${REPO}.git" "${BUILD_DIR}"
    cd "${BUILD_DIR}"
  fi
  success "Source ready at ${BUILD_DIR}"
}

# ── Build ────────────────────────────────────────────────────────────────────
build() {
  cd "${BUILD_DIR}"

  info "Installing frontend dependencies..."
  bun install

  info "Building Klipper Touch (this may take 10-20 minutes)..."
  bun run tauri build

  local deb
  deb=$(find src-tauri/target/release/bundle/deb -name '*.deb' | head -n1)

  if [ -z "${deb}" ]; then
    error "Build failed — no .deb found."
  fi

  success "Build complete: ${deb}"
  echo "${deb}"
}

# ── Install ──────────────────────────────────────────────────────────────────
install_built() {
  local deb
  deb=$(find "${BUILD_DIR}/src-tauri/target/release/bundle/deb" -name '*.deb' | head -n1)

  info "Installing ${deb}..."
  sudo apt-get install -y -qq --allow-downgrades "${deb}"
  success "Installed."

  if systemctl is-enabled --quiet klipper-touch@"${USER}" 2>/dev/null; then
    info "Restarting service..."
    sudo systemctl restart "klipper-touch@${USER}"
    success "Service restarted."
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  printf "${BOLD}${CYAN}"
  cat << 'ART'

  ╔═══════════════════════════════════════╗
  ║     Klipper Touch — Build on Pi      ║
  ╚═══════════════════════════════════════╝

ART
  printf "${NC}"

  install_deps
  install_rust
  # Source cargo env in case it was just installed
  # shellcheck disable=SC1091
  [ -f "${HOME}/.cargo/env" ] && source "${HOME}/.cargo/env"
  install_bun
  export PATH="${HOME}/.bun/bin:${PATH}"
  prepare_source
  build
  install_built

  printf "\n${BOLD}${GREEN}Done!${NC} Klipper Touch has been built and installed.\n\n"
}

main "$@"
