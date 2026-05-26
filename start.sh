#!/bin/bash
set -e

echo ""
echo "============================================"
echo " AI Copilot for Technical Interviews"
echo "============================================"
echo ""

# Check Node
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found. Install Node.js 18+ first."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/2] Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "      Done"
else
    echo "      node_modules already exists, skipping"
fi

echo "[2/2] Starting dev server..."
echo ""
echo " App -> http://localhost:3000"
echo ""
echo " Press Ctrl+C to stop."
echo ""

npm run dev
