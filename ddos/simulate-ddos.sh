#!/bin/bash

# DDoS Simulation Script
# Generates different types of malicious traffic to test BlocSaviour detection

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TARGET="http://localhost:8080"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║           🚨 DDoS SIMULATION STARTED 🚨                ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${YELLOW}Select attack type:${NC}"
echo "1) 🔥 DDoS Attack (100+ requests)"
echo "2) ⚠️  High Rate (50-100 requests)"
echo "3) 💉 SQL Injection attempt"
echo "4) 🎭 XSS Attack attempt"
echo "5) 📁 Path Traversal attempt"
echo "6) 🤖 Malicious Bot"
echo "7) 🎯 Admin Probe"
echo "8) 💣 ALL ATTACKS (Full Suite)"
echo ""
read -p "Enter choice (1-8): " choice

case $choice in
  1)
    echo -e "\n${RED}🔥 Launching DDoS attack (150 requests)...${NC}"
    for i in {1..150}; do
      curl -s "$TARGET" > /dev/null &
      if [ $((i % 10)) -eq 0 ]; then
        echo -ne "\r  Progress: $i/150 requests"
      fi
    done
    wait
    echo -e "\n${GREEN}✓ DDoS attack completed${NC}"
    ;;
    
  2)
    echo -e "\n${YELLOW}⚠️  Launching High Rate attack (75 requests)...${NC}"
    for i in {1..75}; do
      curl -s "$TARGET/test" > /dev/null &
      if [ $((i % 10)) -eq 0 ]; then
        echo -ne "\r  Progress: $i/75 requests"
      fi
    done
    wait
    echo -e "\n${GREEN}✓ High rate attack completed${NC}"
    ;;
    
  3)
    echo -e "\n${RED}💉 SQL Injection attempts...${NC}"
    curl -s "$TARGET/?id=1' OR '1'='1" > /dev/null
    curl -s "$TARGET/?id=1 UNION SELECT * FROM users" > /dev/null
    curl -s "$TARGET/?id=1; DROP TABLE users" > /dev/null
    curl -s "$TARGET/?search=' OR 1=1--" > /dev/null
    echo -e "${GREEN}✓ SQL injection attempts sent${NC}"
    ;;
    
  4)
    echo -e "\n${RED}🎭 XSS Attack attempts...${NC}"
    curl -s "$TARGET/?q=<script>alert('XSS')</script>" > /dev/null
    curl -s "$TARGET/?name=<script>document.cookie</script>" > /dev/null
    curl -s "$TARGET/?url=javascript:alert('XSS')" > /dev/null
    echo -e "${GREEN}✓ XSS attempts sent${NC}"
    ;;
    
  5)
    echo -e "\n${RED}📁 Path Traversal attempts...${NC}"
    curl -s "$TARGET/../../etc/passwd" > /dev/null
    curl -s "$TARGET/../../../windows/system32/config/sam" > /dev/null
    curl -s "$TARGET/....//....//etc/passwd" > /dev/null
    echo -e "${GREEN}✓ Path traversal attempts sent${NC}"
    ;;
    
  6)
    echo -e "\n${YELLOW}🤖 Malicious Bot simulation...${NC}"
    for i in {1..20}; do
      curl -s -A "MaliciousBot/1.0" "$TARGET" > /dev/null &
    done
    wait
    echo -e "${GREEN}✓ Bot requests sent${NC}"
    ;;
    
  7)
    echo -e "\n${RED}🎯 Admin Probe attempts...${NC}"
    curl -s -X POST "$TARGET/admin" > /dev/null
    curl -s -X POST "$TARGET/wp-admin" > /dev/null
    curl -s -X POST "$TARGET/administrator" > /dev/null
    curl -s -X POST "$TARGET/admin/login" > /dev/null
    echo -e "${GREEN}✓ Admin probes sent${NC}"
    ;;
    
  8)
    echo -e "\n${RED}💣 FULL ATTACK SUITE${NC}\n"
    
    echo -e "${BLUE}[1/7] DDoS flood...${NC}"
    for i in {1..150}; do
      curl -s "$TARGET" > /dev/null &
      [ $((i % 20)) -eq 0 ] && echo -ne "\r  → $i/150"
    done
    wait
    echo -e "\r  ${GREEN}✓ DDoS completed${NC}"
    
    sleep 1
    echo -e "${BLUE}[2/7] SQL Injection...${NC}"
    curl -s "$TARGET/?id=1' OR '1'='1" > /dev/null
    curl -s "$TARGET/?search=' OR 1=1--" > /dev/null
    echo -e "  ${GREEN}✓ SQL completed${NC}"
    
    sleep 1
    echo -e "${BLUE}[3/7] XSS Attack...${NC}"
    curl -s "$TARGET/?q=<script>alert('XSS')</script>" > /dev/null
    echo -e "  ${GREEN}✓ XSS completed${NC}"
    
    sleep 1
    echo -e "${BLUE}[4/7] Path Traversal...${NC}"
    curl -s "$TARGET/../../etc/passwd" > /dev/null
    echo -e "  ${GREEN}✓ Traversal completed${NC}"
    
    sleep 1
    echo -e "${BLUE}[5/7] Bot Attacks...${NC}"
    for i in {1..30}; do
      curl -s -A "MaliciousBot/1.0" "$TARGET" > /dev/null &
    done
    wait
    echo -e "  ${GREEN}✓ Bot completed${NC}"
    
    sleep 1
    echo -e "${BLUE}[6/7] Admin Probes...${NC}"
    curl -s -X POST "$TARGET/admin" > /dev/null
    curl -s -X POST "$TARGET/wp-admin" > /dev/null
    echo -e "  ${GREEN}✓ Admin probes completed${NC}"
    
    sleep 1
    echo -e "${BLUE}[7/7] High Rate Traffic...${NC}"
    for i in {1..60}; do
      curl -s "$TARGET/api/stats" > /dev/null &
    done
    wait
    echo -e "  ${GREEN}✓ High rate completed${NC}"
    
    echo -e "\n${GREEN}✅ Full attack suite completed!${NC}"
    ;;
    
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo -e "\n${CYAN}📊 Check results:${NC}"
echo -e "  ${YELLOW}• View in browser:${NC}    http://localhost:3000/malicious"
echo -e "  ${YELLOW}• Check blockchain:${NC}   curl http://localhost:8080/api/nfts | jq"
echo -e "  ${YELLOW}• View stats:${NC}         curl http://localhost:8080/api/stats | jq"
echo ""
echo -e "${PURPLE}💡 Your IP should now be flagged on the blockchain!${NC}\n"
