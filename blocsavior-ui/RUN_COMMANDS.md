# 🚀 Run Everything - Command Cheat Sheet

## Terminal 1: Blockchain Node

```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node --dev
```

**Leave this running!** You should see:
```
✨ Imported #1 (0x...)
✨ Imported #2 (0x...)
✨ Imported #3 (0x...)
```

## Terminal 2: Frontend

```bash
cd /home/sonu/saviour/blocsavior-ui
npm run dev
```

**Open:** http://localhost:3000

## Terminal 3: Integration (One-time)

```bash
cd /home/sonu/saviour/blocsavior-ui
./integrate-blockchain.sh
```

## Terminal 4: Polkadot.js Apps (Optional)

**Open:** https://polkadot.js.org/apps

**Connect to:** `ws://127.0.0.1:9944`

---

## Quick Commands Reference

### Blockchain Commands

```bash
# Build blockchain (if needed)
cd /home/sonu/saviour/bloc-saviour
cargo build --release

# Run blockchain
./target/release/solochain-template-node --dev

# Purge blockchain (fresh start)
./target/release/solochain-template-node purge-chain --dev -y

# Check blockchain status
curl -H "Content-Type: application/json" \
     -d '{"id":1, "jsonrpc":"2.0", "method":"system_health"}' \
     http://127.0.0.1:9933
```

### Frontend Commands

```bash
# Install dependencies
cd /home/sonu/saviour/blocsavior-ui
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

### Integration Commands

```bash
# Install Polkadot.js (manual)
npm install @polkadot/api @polkadot/extension-dapp @polkadot/util @polkadot/util-crypto

# OR use the integration script
./integrate-blockchain.sh
```

---

## Useful Checks

### Check if blockchain is running

```bash
# Method 1: RPC call
curl -H "Content-Type: application/json" \
     -d '{"id":1, "jsonrpc":"2.0", "method":"system_chain"}' \
     http://127.0.0.1:9933

# Method 2: WebSocket check
wscat -c ws://127.0.0.1:9944
```

### Check current block number

```bash
curl -H "Content-Type: application/json" \
     -d '{"id":1, "jsonrpc":"2.0", "method":"chain_getHeader"}' \
     http://127.0.0.1:9933
```

### Check number of IP tokens

```bash
# Using Polkadot.js Apps:
# Developer -> Chain State -> ipToken -> ipTokens()
# Or use the frontend dashboard
```

---

## Test Data Creation

### Method 1: Using Polkadot.js Apps UI

1. Open https://polkadot.js.org/apps
2. Connect to `ws://127.0.0.1:9944`
3. Go to **Developer** → **Extrinsics**
4. Select:
   - **Extrinsic:** `ipToken`
   - **Method:** `mintIpToken(ip_address)`
   - **ip_address:** Enter IP as u32 (see conversion below)
5. Click **Submit Transaction**
6. Sign with **Alice** account (default dev account)

### Method 2: Using curl (RPC)

```bash
# Mint IP 192.168.1.1 (3232235777 in u32)
curl -H "Content-Type: application/json" \
     -d '{
       "id":1,
       "jsonrpc":"2.0",
       "method":"author_submitExtrinsic",
       "params":["0x..."]  
     }' \
     http://127.0.0.1:9933
```

### Method 3: Using Python (substrate-interface)

```python
from substrateinterface import SubstrateInterface, Keypair

# Connect
substrate = SubstrateInterface(url="ws://127.0.0.1:9944")

# Create keypair (Alice)
alice = Keypair.create_from_uri('//Alice')

# Mint IP token
call = substrate.compose_call(
    call_module='IpToken',
    call_function='mint_ip_token',
    call_params={'ip_address': 3232235777}  # 192.168.1.1
)

# Submit
extrinsic = substrate.create_signed_extrinsic(call=call, keypair=alice)
receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)

print(f"Extrinsic sent: {receipt.extrinsic_hash}")
```

---

## IP Address Conversion (u32)

The blockchain stores IPs as u32 integers:

### IPv4 to u32

```javascript
// JavaScript
function ipToU32(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

ipToU32('192.168.1.1')   // 3232235777
ipToU32('8.8.8.8')        // 134744072
ipToU32('1.1.1.1')        // 16843009
```

### u32 to IPv4

```javascript
// JavaScript
function u32ToIp(num) {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

u32ToIp(3232235777)  // '192.168.1.1'
u32ToIp(134744072)   // '8.8.8.8'
```

### Common IPs

| IP Address | u32 Value |
|------------|-----------|
| 192.168.1.1 | 3232235777 |
| 192.168.1.100 | 3232235876 |
| 10.0.0.1 | 167772161 |
| 8.8.8.8 | 134744072 |
| 1.1.1.1 | 16843009 |
| 127.0.0.1 | 2130706433 |

---

## Example: Mint 10 Test IPs

Using Polkadot.js Apps, submit these transactions:

1. Mint 192.168.1.1 → `mintIpToken(3232235777)`
2. Mint 192.168.1.2 → `mintIpToken(3232235778)`
3. Mint 192.168.1.3 → `mintIpToken(3232235779)`
4. Mint 192.168.1.4 → `mintIpToken(3232235780)`
5. Mint 192.168.1.5 → `mintIpToken(3232235781)`
6. Mint 8.8.8.8 → `mintIpToken(134744072)`
7. Mint 1.1.1.1 → `mintIpToken(16843009)`
8. Mint 10.0.0.1 → `mintIpToken(167772161)`
9. Mint 172.16.0.1 → `mintIpToken(2886729729)`
10. Mint 127.0.0.1 → `mintIpToken(2130706433)`

Then flag some as malicious:

```
updateThreatStatus(
  ip_address: 3232235777,  // 192.168.1.1
  threat_level: Malicious,
  confidence: 95,
  attack_type: Botnet
)
```

---

## Troubleshooting Quick Fixes

### Blockchain won't start

```bash
# Purge old data
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node purge-chain --dev -y

# Try again
./target/release/solochain-template-node --dev
```

### Frontend won't connect

```bash
# Check blockchain is running
curl http://127.0.0.1:9933

# Reinstall dependencies
cd /home/sonu/saviour/blocsavior-ui
rm -rf node_modules package-lock.json
npm install

# Restart dev server
npm run dev
```

### Port already in use

```bash
# Kill process on port 9944 (blockchain)
lsof -ti:9944 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

---

## Full Stack Startup (All at Once)

Create `start-all.sh`:

```bash
#!/bin/bash

# Terminal 1: Blockchain
gnome-terminal -- bash -c "cd /home/sonu/saviour/bloc-saviour && ./target/release/solochain-template-node --dev; exec bash"

# Wait for blockchain to start
sleep 5

# Terminal 2: Frontend
gnome-terminal -- bash -c "cd /home/sonu/saviour/blocsavior-ui && npm run dev; exec bash"

echo "✅ All services started!"
echo "Blockchain: ws://127.0.0.1:9944"
echo "Frontend: http://localhost:3000"
```

```bash
chmod +x start-all.sh
./start-all.sh
```

---

## Stop Everything

```bash
# Stop blockchain (Ctrl+C in Terminal 1)
# OR
pkill -f solochain-template-node

# Stop frontend (Ctrl+C in Terminal 2)
# OR
pkill -f "next dev"
```

---

## Summary of Ports

- **9944** - Blockchain WebSocket (RPC)
- **9933** - Blockchain HTTP (RPC)
- **9615** - Blockchain Prometheus metrics
- **30333** - Blockchain p2p networking
- **3000** - Frontend (Next.js dev server)

---

**Ready to go! 🚀**

1. Open Terminal 1 → Run blockchain
2. Open Terminal 2 → Run frontend
3. Open browser → http://localhost:3000
4. (Optional) Open Polkadot.js Apps → Mint test IPs
