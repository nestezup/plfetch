#!/usr/bin/env bash
set -euo pipefail

APP_NAME="plfetch"
INSTALL_DIR="${PLFETCH_INSTALL_DIR:-$HOME/.local/share/$APP_NAME}"
BIN_DIR="${PLFETCH_BIN_DIR:-$HOME/.local/bin}"
BIN_PATH="$BIN_DIR/$APP_NAME"
REPO_URL="${PLFETCH_REPO_URL:-}"
RAW_BASE_URL="${PLFETCH_RAW_BASE_URL:-}"

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

install_from_current_directory() {
  local source_dir
  source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  mkdir -p "$INSTALL_DIR"
  cp -R "$source_dir"/bin "$source_dir"/src "$source_dir"/package.json "$source_dir"/README.md "$INSTALL_DIR"/
}

install_from_git() {
  need_command git
  rm -rf "$INSTALL_DIR"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
}

install_from_raw_base() {
  need_command curl
  mkdir -p "$INSTALL_DIR/bin" "$INSTALL_DIR/src"
  curl -fsSL "$RAW_BASE_URL/package.json" -o "$INSTALL_DIR/package.json"
  curl -fsSL "$RAW_BASE_URL/README.md" -o "$INSTALL_DIR/README.md"
  curl -fsSL "$RAW_BASE_URL/bin/plfetch.js" -o "$INSTALL_DIR/bin/plfetch.js"
  curl -fsSL "$RAW_BASE_URL/src/core.js" -o "$INSTALL_DIR/src/core.js"
}

if ! command -v bun >/dev/null 2>&1; then
  cat >&2 <<'EOF'
missing required command: bun

Install Bun first:
  curl -fsSL https://bun.sh/install | bash
EOF
  exit 1
fi

if [[ -n "$RAW_BASE_URL" ]]; then
  install_from_raw_base
elif [[ -n "$REPO_URL" ]]; then
  install_from_git
else
  install_from_current_directory
fi

mkdir -p "$BIN_DIR" "$HOME/.config/$APP_NAME" "$HOME/Downloads/$APP_NAME"
chmod +x "$INSTALL_DIR/bin/plfetch.js"
ln -sf "$INSTALL_DIR/bin/plfetch.js" "$BIN_PATH"

cat <<EOF
Installed $APP_NAME

Command:
  $BIN_PATH

Config:
  $HOME/.config/$APP_NAME/.env

Downloads:
  $HOME/Downloads/$APP_NAME

If '$APP_NAME' is not found, add this to your shell profile:
  echo 'export PATH="\$HOME/.local/bin:\$PATH"' >> ~/.zshrc
  source ~/.zshrc

Windows users:
  Use the PowerShell install steps in README.md.

Next:
  $APP_NAME onboard
EOF
