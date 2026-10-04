#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js 18 or newer (including npm) is required." >&2
  exit 1
fi

NODE_MAJOR=$(node -p 'Number(process.versions.node.split(".")[0])')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js 18 or newer is required; found $(node --version)." >&2
  exit 1
fi

# Reuse the current install when it satisfies package.json. Install or repair
# dependencies when the directory is missing or npm reports an invalid tree.
if npm ls --depth=0 >/dev/null 2>&1; then
  echo "Dependencies are already installed and up to date."
else
  echo "Installing project dependencies..."
  npm install
  echo "Dependencies installed or updated successfully."
fi

echo "Building Suggestion+ MCP server..."
npm run build
echo "Build completed successfully."
echo "Starting Suggestion+ MCP server..."
exec npm start
