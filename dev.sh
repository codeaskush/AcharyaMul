#!/bin/bash
# Start both backend and frontend for local development.
# Usage: ./dev.sh
# Stop:  Ctrl+C (kills both)

set -e

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

DIR="$(cd "$(dirname "$0")" && pwd)"

# Backend
echo "Starting backend on :8000..."
cd "$DIR/backend"
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
echo "Starting frontend on :5173..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  Press Ctrl+C to stop both"
echo "========================================="
echo ""

wait
