#!/bin/bash

# BlocSaviour Complete Startup Script
# This script starts the blockchain node, DDoS server, and Next.js UI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
BLOCKCHAIN_DIR="/home/sonu/saviour/bloc-saviour/target/release"
BLOCKCHAIN_BIN_NAME="solochain-template-node"
DDOS_SERVER_DIR="/home/sonu/saviour/ddos"
UI_DIR="/home/sonu/saviour/blocsavior-ui"

# Log files
BLOCKCHAIN_LOG="/home/sonu/saviour/blockchain.log"
DDOS_LOG="/home/sonu/saviour/ddos/server.log"
UI_LOG="/home/sonu/saviour/blocsavior-ui/nextjs.log"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║              🛡️  BLOC SAVIOUR STARTUP 🛡️               ║"
echo "║                                                        ║"
echo "║         DDoS Prevention Blockchain System              ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if a process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo -ne "${YELLOW}Waiting for $name to start..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -ne "."
    done
    echo -e " ${RED}✗ (timeout)${NC}"
    return 1
}

# Stop existing processes
echo -e "\n${BLUE}[1/4] Stopping existing processes...${NC}"

if check_process "solochain-template-node"; then
    echo -e "  ${YELLOW}→ Stopping blockchain node...${NC}"
    pkill -f "solochain-template-node" 2>/dev/null || true
    sleep 2
fi

if check_process "node.*ddos.*app.js"; then
    echo -e "  ${YELLOW}→ Stopping DDoS server...${NC}"
    pkill -f "node.*ddos.*app.js" 2>/dev/null || true
    sleep 1
fi

if check_process "next dev"; then
    echo -e "  ${YELLOW}→ Stopping Next.js UI...${NC}"
    pkill -f "next dev" 2>/dev/null || true
    sleep 1
fi

echo -e "  ${GREEN}✓ All processes stopped${NC}"

# Start blockchain node
echo -e "\n${BLUE}[2/4] Starting blockchain node...${NC}"

# Check for release build first, then debug
BLOCKCHAIN_BIN=""
if [ -f "$BLOCKCHAIN_DIR/$BLOCKCHAIN_BIN_NAME" ]; then
    BLOCKCHAIN_BIN="$BLOCKCHAIN_DIR/$BLOCKCHAIN_BIN_NAME"
    cd "$BLOCKCHAIN_DIR"
elif [ -f "/home/sonu/saviour/bloc-saviour/target/debug/$BLOCKCHAIN_BIN_NAME" ]; then
    BLOCKCHAIN_BIN="/home/sonu/saviour/bloc-saviour/target/debug/$BLOCKCHAIN_BIN_NAME"
    cd "/home/sonu/saviour/bloc-saviour/target/debug"
    echo -e "  ${YELLOW}→ Using debug build (slower)${NC}"
else
    echo -e "  ${RED}✗ Blockchain binary not found${NC}"
    echo -e "  ${YELLOW}→ Please build the blockchain first:${NC}"
    echo -e "    cd bloc-saviour && cargo build --release"
    echo -e "    OR: cd bloc-saviour && cargo build"
    exit 1
fi

nohup "$BLOCKCHAIN_BIN" --dev --tmp > "$BLOCKCHAIN_LOG" 2>&1 &
BLOCKCHAIN_PID=$!

echo -e "  ${GREEN}✓ Blockchain node started (PID: $BLOCKCHAIN_PID)${NC}"
echo -e "  ${PURPLE}→ WebSocket: ws://127.0.0.1:9944${NC}"
echo -e "  ${PURPLE}→ Log file: $BLOCKCHAIN_LOG${NC}"

# Wait for blockchain to be ready
echo -ne "${YELLOW}  → Waiting for blockchain to initialize..."
sleep 3
for i in {1..20}; do
    if grep -q "Running JSON-RPC" "$BLOCKCHAIN_LOG" 2>/dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    sleep 1
    echo -ne "."
done

# Start DDoS monitoring server
echo -e "\n${BLUE}[3/4] Starting DDoS monitoring server...${NC}"

if [ ! -d "$DDOS_SERVER_DIR" ]; then
    echo -e "  ${RED}✗ DDoS server directory not found${NC}"
    exit 1
fi

cd "$DDOS_SERVER_DIR"
nohup node server/app.js > "$DDOS_LOG" 2>&1 &
DDOS_PID=$!

echo -e "  ${GREEN}✓ DDoS server started (PID: $DDOS_PID)${NC}"
echo -e "  ${PURPLE}→ HTTP: http://localhost:8080${NC}"
echo -e "  ${PURPLE}→ Log file: $DDOS_LOG${NC}"

# Wait for DDoS server
wait_for_service "http://localhost:8080/api/stats" "DDoS server"

# Start Next.js UI
echo -e "\n${BLUE}[4/4] Starting Next.js UI...${NC}"

if [ ! -d "$UI_DIR" ]; then
    echo -e "  ${RED}✗ UI directory not found${NC}"
    exit 1
fi

cd "$UI_DIR"
nohup npm run dev > "$UI_LOG" 2>&1 &
UI_PID=$!

echo -e "  ${GREEN}✓ Next.js UI started (PID: $UI_PID)${NC}"
echo -e "  ${PURPLE}→ Local: http://localhost:3000${NC}"
echo -e "  ${PURPLE}→ Network: http://192.168.1.6:3000${NC}"
echo -e "  ${PURPLE}→ Log file: $UI_LOG${NC}"

# Wait for UI
wait_for_service "http://localhost:3000" "Next.js UI"

# Get network IP
NETWORK_IP=$(hostname -I | awk '{print $1}')

# Summary
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║           ✅  ALL SERVICES STARTED SUCCESSFULLY ✅       ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${CYAN}🔗 Access URLs:${NC}"
echo -e "  ${GREEN}• Blockchain Node:${NC}      ws://127.0.0.1:9944"
echo -e "  ${GREEN}• DDoS Monitor API:${NC}     http://localhost:8080"
echo -e "  ${GREEN}• DDoS Monitor UI:${NC}      http://localhost:8080"
echo -e "  ${GREEN}• BlocSaviour UI:${NC}       http://localhost:3000"
echo -e "  ${GREEN}• Network Access:${NC}       http://$NETWORK_IP:3000"

echo -e "\n${CYAN}📊 Process IDs:${NC}"
echo -e "  ${YELLOW}• Blockchain:${NC}  $BLOCKCHAIN_PID"
echo -e "  ${YELLOW}• DDoS Server:${NC} $DDOS_PID"
echo -e "  ${YELLOW}• Next.js UI:${NC}  $UI_PID"

echo -e "\n${CYAN}📝 Log Files:${NC}"
echo -e "  ${YELLOW}• Blockchain:${NC}  $BLOCKCHAIN_LOG"
echo -e "  ${YELLOW}• DDoS Server:${NC} $DDOS_LOG"
echo -e "  ${YELLOW}• Next.js UI:${NC}  $UI_LOG"

echo -e "\n${CYAN}📖 Quick Commands:${NC}"
echo -e "  ${YELLOW}• View blockchain logs:${NC} tail -f $BLOCKCHAIN_LOG"
echo -e "  ${YELLOW}• View DDoS logs:${NC}       tail -f $DDOS_LOG"
echo -e "  ${YELLOW}• View UI logs:${NC}         tail -f $UI_LOG"
echo -e "  ${YELLOW}• Stop all services:${NC}    ./stop.sh"

echo -e "\n${CYAN}🎯 What's Running:${NC}"
echo -e "  ${GREEN}1.${NC} Blockchain node storing IP NFTs"
echo -e "  ${GREEN}2.${NC} DDoS monitoring server (creates NFTs for malicious IPs)"
echo -e "  ${GREEN}3.${NC} Web UI for exploring IP tokens and transactions"

echo -e "\n${PURPLE}💡 Tip: Open http://localhost:3000 in your browser to start!${NC}\n"

# Save PIDs to file for stop script
echo "BLOCKCHAIN_PID=$BLOCKCHAIN_PID" > /home/sonu/saviour/.pids
echo "DDOS_PID=$DDOS_PID" >> /home/sonu/saviour/.pids
echo "UI_PID=$UI_PID" >> /home/sonu/saviour/.pids

echo -e "${GREEN}✨ BlocSaviour is ready!${NC}\n"
