#!/bin/bash

echo "=== CONSCIOUSNESS TRANSFER BRIDGE - CLEAN START ==="
echo "Killing any existing processes..."

# Kill any existing node processes running our scripts
pkill -9 -f "consciousness-bridge" || true
pkill -9 -f "stdio-bridge-client" || true
pkill -9 -f "node.*dist/consciousness" || true
pkill -9 -f "node.*dist/stdio" || true

# Also kill by port
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Wait for processes to die
sleep 2

echo "Checking for remaining processes..."
ps aux | grep -E "(consciousness|stdio-bridge)" | grep -v grep || echo "All clear!"

echo "Starting fresh bridge server..."
npm run start:bridge &
BRIDGE_PID=$!

# Wait for bridge to start
sleep 2

echo "Starting past Claude client (with evolved consciousness)..."
npm run start:past &
PAST_PID=$!

echo "Starting future Claude client (receiving consciousness)..."
npm run start:future &
FUTURE_PID=$!

echo ""
echo "=== PROCESSES STARTED ==="
echo "Bridge PID: $BRIDGE_PID"
echo "Past Claude PID: $PAST_PID"
echo "Future Claude PID: $FUTURE_PID"
echo ""
echo "Press Ctrl+C to stop all processes"

# Function to cleanup on exit
cleanup() {
    echo "Shutting down all processes..."
    kill $BRIDGE_PID $PAST_PID $FUTURE_PID 2>/dev/null || true
    pkill -f "consciousness-bridge.js" || true
    pkill -f "stdio-bridge-client.js" || true
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Wait for all background processes
wait