# 🚀 Quick Start Guide - BlocSaviour Python Server

## Prerequisites

1. **BlocSaviour blockchain must be running**
2. **Python 3.8+** installed
3. **Virtual environment** (already created in `.venv`)

## Step-by-Step Setup

### Step 1: Start the Blockchain

```bash
# From the project root
cd /home/sonu/saviour
./start.sh
```

Wait for the blockchain to start producing blocks. You should see:
```
💤 Idle (0 peers), best: #123 ...
```

### Step 2: Test Blockchain Connection

```bash
cd /home/sonu/saviour/server
source .venv/bin/activate
python test_blockchain.py
```

Expected output:
```
✅ Connected to blockchain!
   Chain: Development
   Block: #123
   Alice Address: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
   
✅ IpToken pallet is accessible!
✅ All tests passed!
```

### Step 3: Start the Python Server

```bash
# Option 1: Use the start script (recommended)
./start.sh

# Option 2: Manual start
source .venv/bin/activate
python app.py

# Option 3: Development mode (with debug)
./dev.sh
```

Expected output:
```
✅ Connected to BlocSaviour blockchain
   Chain: Development
   Block: #123
   Signer: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
🔄 Syncing existing IP tokens from blockchain...
✅ Synced 0 IP tokens from blockchain
🔔 Subscribed to new blocks

╔════════════════════════════════════════════════╗
║     BlocSaviour Network Monitor Server        ║
║   🎨 Creating IP NFTs for every request       ║
╚════════════════════════════════════════════════╝

Server running on:
  Local:   http://localhost:8080
  Local:   http://127.0.0.1:8080
  Network: http://192.168.x.x:8080

🔨 Every incoming request creates an IP NFT!
```

### Step 4: Test the Server

Open another terminal:

```bash
# Test 1: Check server status
curl http://localhost:8080/api/stats

# Test 2: Check blockchain connection
curl http://localhost:8080/api/blockchain/status

# Test 3: Make a few requests to create NFTs
for i in {1..5}; do
  curl http://localhost:8080/api/stats
  sleep 1
done

# Test 4: View created NFTs
curl http://localhost:8080/api/nfts

# Test 5: View transactions
curl http://localhost:8080/api/transactions
```

### Step 5: Monitor the Server

Watch the console output. For each request you should see:

```
✅ Created NFT for 127.0.0.1
   → Threat: Clean, Confidence: 50%, Attack: None
```

Or for updates:
```
✅ Updated NFT for 127.0.0.1
   → Threat: Suspicious, Confidence: 70%, Attack: Other
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Server statistics |
| `/api/nfts` | GET | All IP NFTs |
| `/api/nft/<ip>` | GET | Specific IP NFT |
| `/api/transactions` | GET | Blockchain transactions |
| `/api/blockchain/status` | GET | Blockchain connection status |
| `/api/logs` | GET | Request logs |
| `/api/logs/export` | GET | Export logs to file |
| `/api/stats/reset` | POST | Reset statistics |

## Troubleshooting

### ❌ "Blockchain not available"

**Problem:** Server can't connect to blockchain

**Solutions:**
1. Check if blockchain is running: `ps aux | grep solochain`
2. Check WebSocket endpoint: `ws://127.0.0.1:9944`
3. Test connection: `python test_blockchain.py`

### ❌ "ModuleNotFoundError: No module named 'substrateinterface'"

**Problem:** Dependencies not installed

**Solution:**
```bash
cd /home/sonu/saviour/server
source .venv/bin/activate
pip install -r requirements.txt
```

### ❌ "Error creating NFT"

**Problem:** Blockchain transaction failed

**Solutions:**
1. Check Alice has balance:
   ```bash
   # In Polkadot.js Apps
   # Navigate to: Developer > Chain state > balances > account
   # Query: Alice (5GrwvaEF...)
   ```
2. Check blockchain logs for errors
3. Verify IpToken pallet is working: `python test_blockchain.py`

### ⚠️ "Subscription handler errors"

**Problem:** Block subscription issues

**Solution:** This is normal and handled gracefully. Transactions are tracked when created, not from blocks.

## Testing with Different IPs

The server detects your IP from the request. To test with different IPs:

### Option 1: Using X-Forwarded-For header
```bash
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:8080/api/stats
curl -H "X-Forwarded-For: 10.0.0.50" http://localhost:8080/api/stats
curl -H "X-Forwarded-For: 172.16.0.1" http://localhost:8080/api/stats
```

### Option 2: Using different user agents (affects threat detection)
```bash
# Clean request
curl http://localhost:8080/api/stats

# Suspicious request (automated tool)
curl -A "curl/7.68.0" http://localhost:8080/api/stats

# Suspicious request (python script)
curl -A "Python-urllib/3.8" http://localhost:8080/api/stats

# Bot detection
curl -A "Mozilla/5.0 (compatible; bot/1.0)" http://localhost:8080/api/stats
```

### Option 3: Sending malicious data (affects threat level)
```bash
# SQL injection attempt
curl -X POST http://localhost:8080/api/stats \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users"}'

# XSS attempt
curl -X POST http://localhost:8080/api/stats \
  -H "Content-Type: application/json" \
  -d '{"data": "<script>alert(1)</script>"}'
```

## Viewing NFTs on Blockchain

### Using Polkadot.js Apps

1. Open https://polkadot.js.org/apps/
2. Connect to Local Node (ws://127.0.0.1:9944)
3. Navigate to: Developer > Chain state
4. Select: ipToken > ipTokens(u32)
5. Enter IP as u32 (e.g., `127.0.0.1` = `2130706433`)
6. Click the `+` button to query

### Convert IP to u32

Python:
```python
def ip_to_u32(ip):
    parts = [int(x) for x in ip.split('.')]
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]

# Example
print(ip_to_u32("127.0.0.1"))  # 2130706433
print(ip_to_u32("192.168.1.1"))  # 3232235777
```

Bash:
```bash
echo "127.0.0.1" | awk -F. '{print ($1 * 256^3) + ($2 * 256^2) + ($3 * 256) + $4}'
```

## Stopping the Server

**Graceful shutdown:**
```
Press Ctrl+C
```

You'll see a shutdown summary:
```
╔════════════════════════════════════════════════╗
║            Server Shutdown Summary            ║
╚════════════════════════════════════════════════╝
  Total Requests:       42
  Unique IPs:           5
  NFTs Created:         5
  Blockchain TXs:       47
  Uptime:               120.45s

✅ Disconnected from BlocSaviour blockchain
```

## Next Steps

1. **Integrate with UI**: The Next.js UI at `blocsavior-ui` can visualize the NFTs
2. **Add more threat detection**: Customize `analyze_threat_level()` function
3. **Rate limiting**: Add IP-based rate limiting using NFT data
4. **DDoS mitigation**: Block IPs marked as malicious
5. **Analytics**: Build dashboards from the NFT data

## Need Help?

- Check logs in `/home/sonu/saviour/server/`
- Test blockchain: `python test_blockchain.py`
- Test server: `python test_server.py`
- View blockchain logs: `tail -f /home/sonu/saviour/blockchain.log`
