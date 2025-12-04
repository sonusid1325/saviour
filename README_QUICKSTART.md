# 🛡️ BlocSaviour - Quick Start Guide

## ✅ Everything is REAL and Working!

### 🚀 Quick Start

**Start Everything:**
```bash
./start.sh
```

**Stop Everything:**
```bash
./stop.sh
```

That's it! 🎉

---

## 📡 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **BlocSaviour UI** | http://localhost:3000 | Main blockchain explorer interface |
| **DDoS Monitor UI** | http://localhost:8080 | Real-time DDoS monitoring dashboard |
| **DDoS API** | http://localhost:8080/api/* | RESTful API for IP data |
| **Blockchain Node** | ws://127.0.0.1:9944 | Direct WebSocket access |

---

## 🎯 What's Real Now?

### ✅ Blockchain Integration
- **REAL blockchain node** running (not mock data)
- **REAL IP tokens** minted on-chain
- **REAL transactions** stored in blocks
- **REAL-time sync** between server and blockchain

### ✅ DDoS Server
- Connects to blockchain automatically
- Creates IP NFTs for every request
- Syncs existing tokens from blockchain on startup
- Updates threat levels on blockchain
- Real-time block subscription

### ✅ Next.js UI
- Fetches data directly from blockchain
- Auto-updates every 5 seconds
- Shows real transactions, IP tokens, and stats
- No more mock data!

---

## 🔍 How It Works

1. **DDoS Server** (`http://localhost:8080`)
   - Receives HTTP requests
   - Detects malicious patterns (DDoS, rate limiting, etc.)
   - **Creates IP NFT on blockchain** for each unique IP
   - Updates threat levels in real-time

2. **Blockchain Node** (`ws://127.0.0.1:9944`)
   - Stores IP tokens as NFTs
   - Tracks threat levels, confidence scores, attack types
   - Immutable history of all IP activity
   - Provides query interface via WebSocket

3. **BlocSaviour UI** (`http://localhost:3000`)
   - Connects to blockchain node
   - Displays all IP tokens
   - Shows transaction history
   - Real-time updates

---

## 📊 Test It Out

### 1. Generate Some Traffic
```bash
# Make requests to DDoS server
curl http://localhost:8080
curl http://localhost:8080/test
curl http://localhost:8080/api/stats
```

### 2. View on Blockchain
```bash
# Check blockchain status
curl http://localhost:8080/api/blockchain/status | jq

# Get all IP NFTs from blockchain
curl http://localhost:8080/api/nfts | jq
```

### 3. Open the UI
Open http://localhost:3000 in your browser and see:
- Your IP minted as an NFT
- Real blockchain data
- Live transaction updates

---

## 📝 View Logs

```bash
# Blockchain logs
tail -f blockchain.log

# DDoS server logs
tail -f ddos/server.log

# Next.js UI logs
tail -f blocsavior-ui/nextjs.log
```

---

## 🔧 Manual Operations

### Start Individual Services

```bash
# Blockchain only
cd bloc-saviour/target/release
./solochain-template-node --dev --tmp

# DDoS server only
cd ddos
node server/app.js

# UI only
cd blocsavior-ui
npm run dev
```

### Check Status
```bash
# Check running processes
ps aux | grep -E "solochain|node.*app.js|next dev"

# Check ports
netstat -tulpn | grep -E "3000|8080|9944"
```

---

## 🎨 Features

### DDoS Server Features
- ✅ Real-time threat detection
- ✅ IP NFT minting on blockchain
- ✅ Automatic threat level updates
- ✅ Attack type classification
- ✅ Historical tracking
- ✅ RESTful API

### Blockchain Features
- ✅ Custom IP Token pallet
- ✅ NFT-based IP representation
- ✅ Threat level storage (Clean, Suspicious, Malicious, Rehabilitated)
- ✅ Attack type tracking (DDoS, Brute Force, HTTP Flood, etc.)
- ✅ Confidence scoring
- ✅ Flagging & rehabilitation system

### UI Features
- ✅ Real-time blockchain data
- ✅ Auto-refresh (every 5 seconds)
- ✅ IP token explorer
- ✅ Transaction history
- ✅ Malicious IP filtering
- ✅ Search functionality
- ✅ Responsive design

---

## 🚨 Troubleshooting

### UI shows "Connecting to blockchain..."
```bash
# Check if blockchain is running
curl http://localhost:8080/api/blockchain/status

# Restart everything
./stop.sh && ./start.sh
```

### No data showing
```bash
# Generate some traffic first
for i in {1..10}; do curl http://localhost:8080; done

# Wait a few seconds, then refresh UI
```

### Port already in use
```bash
# Stop everything first
./stop.sh

# Then start again
./start.sh
```

---

## 🎯 Next Steps

1. **Generate Malicious Traffic**: Use the DDoS simulation tools in `/ddos` folder
2. **Monitor in Real-Time**: Watch the dashboard at http://localhost:3000
3. **Check Blockchain**: View raw data at http://localhost:8080/api/nfts
4. **Explore API**: See `/bloc-saviour/API_IMPLEMENTATION_GUIDE.md` for all endpoints

---

## 📦 What's Included

```
saviour/
├── start.sh              # 🚀 One-command startup
├── stop.sh               # 🛑 One-command shutdown
├── bloc-saviour/         # Blockchain node (Substrate)
├── ddos/                 # DDoS monitoring server
├── blocsavior-ui/        # Next.js web interface
├── blockchain.log        # Blockchain logs
└── README_QUICKSTART.md  # This file
```

---

## 🎉 You're All Set!

Everything is connected and working with REAL blockchain data!

**Open http://localhost:3000 and start exploring! 🚀**
