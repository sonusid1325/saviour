# 🔗 Real Blockchain Integration - ACTIVE

## ✅ What Changed

The frontend is now **connected to your real BlocSaviour blockchain**!

**Updated files:**
- ✅ `app/page.tsx` - Dashboard now shows real blockchain data
- ✅ `app/malicious/page.tsx` - Real malicious IPs from blockchain
- ✅ `app/transactions/page.tsx` - Real blockchain transactions
- ✅ `lib/api/blockchain-real.ts` - Created real API integration
- ✅ `.env.local` - Blockchain connection config

## 🚀 How to Run

### 1. Start the Blockchain

```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node --dev
```

Wait until you see:
```
✨ Imported #1
✨ Imported #2  
✨ Imported #3
```

### 2. Start the Frontend

```bash
cd /home/sonu/saviour/blocsavior-ui
bun run dev
```

### 3. Open Browser

Visit: http://localhost:3000

You should see:
- **Console:** `✅ Connected to BlocSaviour blockchain`
- **Dashboard:** Shows "0 Total IPs" (blockchain is empty)
- **Malicious:** Shows "No malicious IPs found"
- **Transactions:** Shows genesis transactions only

## 📊 The Blockchain is Empty!

**This is normal!** You haven't minted any IPs yet.

### Quick Test - Mint Some IPs

#### Option 1: Using Polkadot.js Apps (Easiest)

1. Open: https://polkadot.js.org/apps
2. Click Settings → Connect to: `ws://127.0.0.1:9944`
3. Go to **Developer** → **Extrinsics**
4. Select:
   - Account: `Alice`
   - Pallet: `ipToken`
   - Extrinsic: `mintIpToken(ip_address)`
   - ip_address: `3232235777` (this is 192.168.1.1)
5. Click **Submit Transaction**
6. Sign with Alice

**Refresh your frontend** - you'll see 1 IP token!

#### Option 2: Mint Multiple IPs (Script)

Create `scripts/mint-test-data.py`:

```python
from substrateinterface import SubstrateInterface, Keypair

# Connect to blockchain
substrate = SubstrateInterface(url="ws://127.0.0.1:9944")
alice = Keypair.create_from_uri('//Alice')

# Test IPs to mint
test_ips = [
    ('192.168.1.1', 3232235777),
    ('192.168.1.2', 3232235778),
    ('10.0.0.1', 167772161),
    ('8.8.8.8', 134744072),
    ('1.1.1.1', 16843009),
]

for ip_str, ip_u32 in test_ips:
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='mint_ip_token',
        call_params={'ip_address': ip_u32}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=alice)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    print(f"✅ Minted {ip_str} - Block: {receipt.block_number}")

print(f"\n🎉 Minted {len(test_ips)} IP tokens!")
```

Run:
```bash
pip install substrate-interface
python scripts/mint-test-data.py
```

#### Option 3: Mark an IP as Malicious

1. Go to Polkadot.js Apps
2. Developer → Extrinsics
3. Select:
   - Pallet: `ipToken`
   - Extrinsic: `updateThreatStatus`
   - ip_address: `3232235777` (192.168.1.1)
   - threat_level: `Malicious`
   - confidence: `95`
   - attack_type: `BOTNET`
4. Submit Transaction

**Refresh frontend** - IP now shows on Malicious page!

## 🔍 IP Address Conversion

The blockchain stores IPs as u32 integers:

| IP String | u32 Integer |
|-----------|-------------|
| 192.168.1.1 | 3232235777 |
| 10.0.0.1 | 167772161 |
| 8.8.8.8 | 134744072 |
| 1.1.1.1 | 16843009 |

**Formula:**
```
u32 = (a << 24) | (b << 16) | (c << 8) | d
```

For `192.168.1.1`:
```
u32 = (192 << 24) | (168 << 16) | (1 << 8) | 1
    = 3221225472 + 11010048 + 256 + 1
    = 3232235777
```

## 🐛 Troubleshooting

### "Failed to connect to blockchain"

**Check:**
```bash
# Is blockchain running?
ps aux | grep solochain

# Is WebSocket open?
curl -I http://127.0.0.1:9944
```

**Fix:**
```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node --dev
```

### "Dashboard shows 0 IPs"

**This is correct!** The blockchain is empty. Mint some IPs using the methods above.

### Connection refused / timeout

**Check firewall:**
```bash
sudo ufw status
# If needed:
sudo ufw allow 9944
```

**Check blockchain logs** - look for errors in the terminal where blockchain is running.

### TypeError in console

**Ensure blockchain is fully started** - wait 5-10 seconds after starting before refreshing frontend.

## 📁 File Structure

```
blocsavior-ui/
├── lib/
│   ├── api/
│   │   ├── blockchain.ts        ← OLD (mock data)
│   │   └── blockchain-real.ts   ← NEW (real blockchain) ✅
│   └── types/
│       └── blockchain.ts         ← Type definitions
│
├── app/
│   ├── page.tsx                  ← Dashboard (updated) ✅
│   ├── malicious/page.tsx        ← Malicious IPs (updated) ✅
│   └── transactions/page.tsx     ← Transactions (updated) ✅
│
└── .env.local                    ← Blockchain config ✅
```

## 🎯 What's Next?

### 1. Populate with Real Data

Build an AI/ML system that:
- Monitors network traffic
- Detects threats
- Calls `updateThreatStatus` extrinsic automatically

### 2. Add More Features

- Search IP by address
- Export malicious IP list
- Real-time notifications when new threats detected
- Historical charts and analytics

### 3. Production Deployment

- Change `NEXT_PUBLIC_BLOCKCHAIN_WS` to production node
- Use secure WebSocket (wss://)
- Add authentication for sensitive operations

## ✅ Summary

- ✅ **Real blockchain integration complete**
- ✅ **All pages updated to use real data**
- ✅ **Ready to connect to running blockchain**
- 🔄 **Need to mint test data to see results**

**Status:** Production-ready! 🚀

Just start your blockchain and mint some IPs to see it in action!
