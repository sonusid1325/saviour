# 🔥 BlocSaviour - Complete Integration Guide

## ✅ ALL FIXED! Now Fully Integrated

Your system has **3 components** and they're NOW properly connected:

1. ✅ **Blockchain Node** (`bloc-saviour`) - Running at `ws://127.0.0.1:9944`
2. ✅ **DDoS Monitor** (`ddos/server`) - Connects to blockchain & mints IP tokens
3. ✅ **Next.js UI** (`blocsavior-ui`) - Reads real blockchain data & transactions

---

## What Was Fixed

### 1. DDoS Monitor (`ddos/server/app.js`)
- ✅ Now waits for block inclusion (not just submission)
- ✅ Calls `updateThreatStatus()` for malicious IPs
- ✅ Maps threat levels correctly (Clean/Suspicious/Malicious)
- ✅ Maps attack types (HttpFlood, Botnet, PortScan, etc.)
- ✅ Logs real blockchain transactions with block hashes

### 2. Next.js UI (`blocsavior-ui/lib/api/blockchain-real.ts`)
- ✅ Scans recent blocks for ipToken transactions
- ✅ Reads actual extrinsics from blockchain
- ✅ Extracts IP addresses from transaction args
- ✅ Shows success/failed status from events
- ✅ Displays real timestamps from blocks

---

## 🚀 COMPLETE SETUP - Step by Step

### Step 1: Start the Blockchain Node

```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/node-template --dev --tmp
```

**What it does:**
- Starts a clean blockchain (--tmp = fresh state)
- Listens on `ws://127.0.0.1:9944`
- Creates blocks every 6 seconds

---

### Step 2: Start the DDoS Monitor (WITH Blockchain Integration)

```bash
cd /home/sonu/saviour/ddos/server
node app.js
```

**What it does NOW (after fix):**
- ✅ Connects to blockchain at startup
- ✅ Mints IP token for EVERY new IP
- ✅ Updates threat status for malicious IPs
- ✅ Waits for block inclusion (real transactions)
- ✅ Logs real blockchain activity

**You should see:**
```
✅ Connected to BlocSaviour blockchain
   Chain: Development
   Signer: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

---

### Step 3: Generate Some Traffic

**Option A: Use the built-in attack simulator**
```bash
cd /home/sonu/saviour/ddos/server
node attack-simulator.js
```

**Option B: Manual requests**
```bash
# Make some requests to generate IP tokens
for i in {1..5}; do
  curl http://localhost:8080/
  sleep 1
done

# Check stats
curl http://localhost:8080/api/stats

# Check NFTs
curl http://localhost:8080/api/nfts
```

**You should see in DDoS Monitor logs:**
```
🔨 NFT Minted: 192.168.1.100 → Token #3232235876 (Block: 0x1234...)
   ✓ Finalized in block 0x5678...
⚠️  Threat Updated: 192.168.1.100 → Malicious (90% confidence)
   Attack Type: HttpFlood
```

---

### Step 4: Start the Next.js UI

```bash
cd /home/sonu/saviour/blocsavior-ui
npm run dev
```

Open: http://localhost:3000

**What you'll NOW see:**
- ✅ Real blockchain stats (total tokens, malicious count, block number)
- ✅ IP tokens minted via the DDoS monitor
- ✅ Threat levels and attack types
- ✅ **REAL TRANSACTIONS** from blockchain extrinsics!

---

## 🎯 Testing the Complete Flow

### Test 1: Make a request to DDoS Monitor

```bash
curl http://localhost:8080/
```

**Watch Terminal 1 (Blockchain):**
```
2025-12-03 00:42:15 ✨ Imported #1234 (0x1a2b...)
```

**Watch Terminal 2 (DDoS Monitor):**
```
🔨 NFT Minted: 192.168.1.100 → Token #3232235876 (Block: 0x1a2b...)
   ✓ Finalized in block 0x3c4d...
```

**Check Terminal 3 (Next.js UI):**
- Refresh the page
- Go to "Transactions" page
- You should see: **Mint transaction for 192.168.1.100**

---

### Test 2: Trigger a malicious detection

```bash
# Make rapid requests to trigger rate limiting
for i in {1..100}; do curl http://localhost:8080/ & done
wait
```

**DDoS Monitor will detect this as suspicious:**
```
⚠️  Threat Updated: 192.168.1.100 → Suspicious (75% confidence)
   Attack Type: HttpFlood
```

**UI will show:**
- IP token updated to "Suspicious" threat level
- New "Update" transaction in transactions list
- Increased flagged count

---

## 📊 Complete Architecture

```
┌─────────────────┐
│  DDoS Monitor   │
│  (Port 8080)    │
│                 │
│  - Receives     │
│    requests     │
│  - Analyzes     │
│    threats      │
└────────┬────────┘
         │
         │ 1. mintIpToken()
         │ 2. updateThreatStatus()
         ▼
┌─────────────────┐
│  Blockchain     │
│  (Port 9944)    │
│                 │
│  - Stores IP    │
│    tokens       │
│  - Records      │
│    history      │
└────────┬────────┘
         │
         │ Query transactions
         │ Query IP tokens
         ▼
┌─────────────────┐
│  Next.js UI     │
│  (Port 3000)    │
│                 │
│  - Dashboard    │
│  - IP Tokens    │
│  - Transactions │
└─────────────────┘
```

---

## 🔧 Troubleshooting

### "No transactions yet" still showing

**Solution:**
```bash
# 1. Restart Next.js UI to pick up code changes
cd /home/sonu/saviour/blocsavior-ui
npm run dev

# 2. Make a request to generate a transaction
curl http://localhost:8080/

# 3. Wait 6 seconds for block to be created

# 4. Refresh the UI
```

### "Blockchain connection failed"

**Check if blockchain is running:**
```bash
ps aux | grep node-template
```

**If not running, start it:**
```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/node-template --dev --tmp
```

### "DDoS monitor not minting IPs"

**Check the logs:**
```bash
cd /home/sonu/saviour/ddos/server
node app.js
```

**Look for:**
```
✅ Connected to BlocSaviour blockchain
   Chain: Development
```

**If you see:**
```
⚠️  Blockchain not available, running without NFT creation
```

Then the blockchain is not running or not accessible.

---

## 🎉 Success Checklist

- [ ] Blockchain running on port 9944
- [ ] DDoS Monitor connected and logging `✅ Connected to BlocSaviour blockchain`
- [ ] Next.js UI running on port 3000
- [ ] Made at least one request: `curl http://localhost:8080/`
- [ ] DDoS Monitor logs show `🔨 NFT Minted: ...`
- [ ] UI Dashboard shows stats > 0
- [ ] UI Transactions page shows at least 1 transaction
- [ ] UI IP Tokens page shows your IP

---

## 📚 Next Steps

1. **Test attack simulation:**
   ```bash
   cd /home/sonu/saviour/ddos/server
   node attack-simulator.js
   ```

2. **Test bulk updates:**
   Check the API implementation guide for bulk operations

3. **Deploy to production:**
   - Build blockchain: `cargo build --release`
   - Build UI: `npm run build`
   - Run blockchain as service
   - Run DDoS monitor with PM2
   - Deploy UI with nginx

---

## 🔗 Related Files

- API Implementation: `/home/sonu/saviour/bloc-saviour/API_IMPLEMENTATION_GUIDE.md`
- DDoS Monitor: `/home/sonu/saviour/ddos/server/app.js`
- Blockchain API: `/home/sonu/saviour/blocsavior-ui/lib/api/blockchain-real.ts`
- Main README: `/home/sonu/saviour/README.md` (if it exists)

<function_calls>
<invoke name="view">
<parameter name="path">/home/sonu/saviour/blocsavior-ui/lib/api/blockchain-real.ts