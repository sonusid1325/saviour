#!/bin/bash

# BlocSaviour Stop Script
# Gracefully stops all BlocSaviour services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║              🛑  STOPPING BLOC SAVIOUR  🛑              ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Read PIDs if available
if [ -f "/home/sonu/saviour/.pids" ]; then
    source /home/sonu/saviour/.pids
fi

# Stop blockchain node
echo -e "${BLUE}[1/3] Stopping blockchain node...${NC}"
if pgrep -f "solochain-template-node" > /dev/null; then
    pkill -TERM -f "solochain-template-node"
    sleep 2
    if pgrep -f "solochain-template-node" > /dev/null; then
        pkill -9 -f "solochain-template-node"
    fi
    echo -e "  ${GREEN}✓ Blockchain node stopped${NC}"
else
    echo -e "  ${YELLOW}→ Blockchain node not running${NC}"
fi

# Stop DDoS server
echo -e "\n${BLUE}[2/3] Stopping DDoS monitoring server...${NC}"
if pgrep -f "node.*ddos.*app.js" > /dev/null; then
    pkill -TERM -f "node.*ddos.*app.js"
    sleep 1
    if pgrep -f "node.*ddos.*app.js" > /dev/null; then
        pkill -9 -f "node.*ddos.*app.js"
    fi
    echo -e "  ${GREEN}✓ DDoS server stopped${NC}"
else
    echo -e "  ${YELLOW}→ DDoS server not running${NC}"
fi

# Stop Next.js UI
echo -e "\n${BLUE}[3/3] Stopping Next.js UI...${NC}"
if pgrep -f "next dev" > /dev/null; then
    pkill -TERM -f "next dev"
    sleep 1
    if pgrep -f "next dev" > /dev/null; then
        pkill -9 -f "next dev"
    fi
    echo -e "  ${GREEN}✓ Next.js UI stopped${NC}"
else
    echo -e "  ${YELLOW}→ Next.js UI not running${NC}"
fi

# Clean up PID file
rm -f /home/sonu/saviour/.pids

echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║         ✅  ALL SERVICES STOPPED SUCCESSFULLY  ✅        ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"
