# 🎉 BlocSaviour - Quick Start Guide

## ✅ What You Have

### 1. Blockchain (Built Successfully!)
- ✅ Complete Substrate blockchain at `/home/sonu/saviour/bloc-saviour`
- ✅ IP Token Pallet (stores IPs as NFT-like tokens)
- ✅ Access Control Pallet (authorization for AI nodes)
- ✅ Compiled and ready to run

### 2. Frontend (Next.js + shadcn/ui)
- ✅ Dashboard with stats
- ✅ IP search and details
- ✅ Transaction history view
- ✅ Monochrome minimalist design (like Solscan)
- ✅ Currently using MOCK data

## 🚀 Quick Start (In Order)

### Step 1: Start the Blockchain

```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node --dev
```

You should see:
```
2024-12-02 16:30:00 Substrate Node    
2024-12-02 16:30:00 ✌️  version 4.0.0-dev
2024-12-02 16:30:00 🏷  Node name: fuzzy-night-1234    
2024-12-02 16:30:00 👤 Role: AUTHORITY
2024-12-02 16:30:00 💾 Database: RocksDb at /tmp/substrate...
2024-12-02 16:30:00 🏷  Local node identity is: 12D3KooW...
2024-12-02 16:30:01 🙌 Starting consensus session...
2024-12-02 16:30:06 ✨ Imported #1 (0x1234...)
2024-12-02 16:30:12 ✨ Imported #2 (0x5678...)
```

The blockchain is now running on `ws://127.0.0.1:9944`

### Step 2: Connect Frontend to Blockchain

```bash
cd /home/sonu/saviour/blocsavior-ui

# Run the integration script
./integrate-blockchain.sh
```

This will:
- Install @polkadot/api packages
- Create real blockchain API client
- Set up environment variables

### Step 3: Start the Frontend

```bash
npm run dev
```

Open http://localhost:3000

## 📊 What the Blockchain Stores

Your blockchain stores **IP reputation data**:

### Each IP Token Contains:
- **IP Address** (e.g., 192.168.1.100)
- **Threat Level**: Unknown | Clean | Suspicious | Malicious | Rehabilitated
- **Attack Types**: SYN_FLOOD, UDP_FLOOD, HTTP_FLOOD, BOTNET, etc.
- **Confidence Score**: 0-100
- **First Seen**: Block number when IP was first encountered
- **History**: Last 10 status changes with timestamps

### Current Status:
- ❌ Blockchain is **EMPTY** (no IPs minted yet)
- ✅ Frontend shows **MOCK DATA** for demo

## 🎯 Next Steps to Get Real Data

### Option 1: Manually Mint Test IPs

Use Polkadot.js Apps UI:

1. Open: https://polkadot.js.org/apps
2. Click "Connect" → "Local Node" → `ws://127.0.0.1:9944`
3. Go to "Developer" → "Extrinsics"
4. Select:
   - Extrinsic: `ipToken`
   - Method: `mintIpToken(ip_address)`
   - ip_address: `3232235777` (192.168.1.1 in u32 format)
5. Click "Submit Transaction"
6. Sign with Alice account

### Option 2: Build an AI Integration Script

Create a Python script that:
1. Monitors network traffic
2. Detects threats
3. Calls blockchain extrinsics to mint/update IP tokens

Example (pseudo-code):
```python
from substrateinterface import SubstrateInterface

# Connect to blockchain
substrate = SubstrateInterface(url="ws://127.0.0.1:9944")

# Mint IP when threat detected
call = substrate.compose_call(
    call_module='IpToken',
    call_function='mint_ip_token',
    call_params={'ip_address': 3232235777}  # 192.168.1.1
)

# Submit extrinsic (requires account keypair)
extrinsic = substrate.create_signed_extrinsic(call=call, keypair=alice_keypair)
receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
```

### Option 3: Use the Mock Data (For Now)

The frontend currently uses mock data - it works perfectly for:
- Demo purposes
- UI/UX testing
- Frontend development
- Presentations

To switch to real blockchain data:
1. Blockchain must be running
2. Run `./integrate-blockchain.sh`
3. Change imports in components:
   ```typescript
   // FROM:
   import { BlocSaviourAPI } from '@/lib/api/blockchain';
   
   // TO:
   import { BlocSaviourAPI } from '@/lib/api/blockchain-real';
   ```

## 🧪 Testing the Integration

### Test 1: Check Blockchain Connection

```bash
# In browser console (http://localhost:3000)
# You should see:
✅ Connected to BlocSaviour blockchain
Chain: Development
Version: 4.0.0-dev
```

### Test 2: Query Empty Blockchain

The dashboard will show:
- Total IPs: 0
- Malicious: 0
- Clean: 0

This is expected! The blockchain is empty.

### Test 3: Mint a Test IP

Using Polkadot.js Apps, mint an IP.
Frontend should update automatically (if using real API).

## 📁 Project Structure

```
/home/sonu/saviour/
├── bloc-saviour/                 # Substrate Blockchain
│   ├── pallets/
│   │   ├── ip-token/            # Main IP token pallet
│   │   └── access-control/      # Authorization pallet
│   ├── runtime/                 # Blockchain runtime
│   └── target/release/
│       └── solochain-template-node  # Compiled node
│
└── blocsavior-ui/               # Next.js Frontend
    ├── app/                     # Pages (dashboard, IP details, etc.)
    ├── components/              # UI components
    ├── lib/
    │   ├── api/
    │   │   ├── blockchain.ts    # MOCK API (current)
    │   │   └── blockchain-real.ts  # REAL API (new)
    │   └── types/               # TypeScript types
    └── BLOCKCHAIN_INTEGRATION.md
```

## 🐛 Troubleshooting

### "Failed to connect to blockchain"
- ✅ Ensure blockchain is running: `./target/release/solochain-template-node --dev`
- ✅ Check WebSocket URL: `ws://127.0.0.1:9944`
- ✅ Check firewall/ports

### "No data showing"
- ✅ Blockchain is empty (normal!)
- ✅ Mint test IPs using Polkadot.js Apps
- ✅ Or continue using mock data

### "Type errors"
- ✅ Run: `npm install @polkadot/api`
- ✅ Check TypeScript types match blockchain types

## 📚 Documentation

1. **BLOCKCHAIN_INTEGRATION.md** - Complete integration guide
2. **README.md** - Project overview
3. **FRONTEND_README.md** - Frontend documentation
4. **BUILD_SUMMARY.md** - Build details

## 🎨 Frontend Features

### Current Pages:
- **Dashboard** (`/`) - Overview statistics
- **IP Search** (`/ip/[address]`) - IP token details
- **Transactions** (`/transactions`) - Recent blockchain activity

### Components:
- Stats cards with real-time updates
- IP token details with history
- Transaction table with pagination
- Threat level badges (color-coded)
- Block explorer link

## 🔮 Future Enhancements

1. **Real-time Updates**
   - WebSocket subscriptions for new blocks
   - Live threat level changes
   - Push notifications for new attacks

2. **AI Integration**
   - Python script to analyze network traffic
   - Automatic IP minting when threats detected
   - ML model for threat classification

3. **Advanced Features**
   - IPv6 support
   - Bulk IP operations
   - Whitelist management UI
   - Export/import threat data
   - Analytics dashboard with charts

4. **Cross-Chain**
   - Share reputation data with other chains
   - Federated threat intelligence
   - Interchain communication

## 🎯 Summary

**YOU ARE HERE:**
- ✅ Blockchain built and compiles successfully
- ✅ Frontend built with beautiful UI
- ✅ Integration guide ready
- 🔄 Need to connect frontend to blockchain
- 🔄 Need to populate blockchain with data

**TO GET STARTED:**
1. Run blockchain: `./target/release/solochain-template-node --dev`
2. Run frontend: `npm run dev`
3. (Optional) Run integration: `./integrate-blockchain.sh`
4. (Optional) Mint test IPs via Polkadot.js Apps

**STATUS:** Ready for demo with mock data, or ready to integrate with live blockchain!

---

**Need help?**
- Read `BLOCKCHAIN_INTEGRATION.md` for detailed integration steps
- Check blockchain logs for errors
- Test connection using Polkadot.js Apps
- Ask me any questions!

🎉 **Happy hacking!**
