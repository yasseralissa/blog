#!/bin/bash
cd /home/caesar/opencode
pkill -f "node server.js" 2>/dev/null
sleep 2
node server.js > server_output.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > server.pid
sleep 3
if ps -p $SERVER_PID > /dev/null; then
  echo "Server started with PID $SERVER_PID"
  exit 0
else
  echo "Server failed to start"
  cat server_output.log
  exit 1
fi