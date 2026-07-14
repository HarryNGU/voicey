#!/bin/zsh
# Voice Reader — double-click this file (or run it in Terminal) to start the
# local text-to-speech server. Leave the window open while you use the
# extension; close it (or press Ctrl+C) to stop the server.

cd "$(dirname "$0")/server" || exit 1

echo "Starting Voice Reader server..."
echo "(first start after a reboot takes ~30s to load and warm up the voice model)"
echo ""

export COQUI_TOS_AGREED=1
exec ./.venv/bin/python -m uvicorn main:app --port 8765
