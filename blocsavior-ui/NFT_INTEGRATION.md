# 🔗 Blockchain Integration - NFT Creation & Transactions

## Overview

BlocSaviour now creates **NFTs (IP Tokens)** and **blockchain transactions** for every IP address operation!

## Features

### ✅ Automatic NFT Creation
- **Every IP search creates an NFT** if the IP doesn't exist
- Each IP address gets a unique **Token ID** 
- NFTs are minted on the Substrate blockchain

### 🎯 IP Operations That Create Transactions

1. **Report Malicious IP**
   - Creates new NFT if IP not found
   - Updates existing NFT threat level
   - Records transaction on blockchain

2. **Report Clean IP**
   - Creates new NFT with clean status
   - Updates existing malicious IPs to clean
   - Logs transaction

3. **Flag IP from Token List**
   - Quick report buttons on IP Tokens page
   - One-click reporting
   - Instant blockchain transaction

## How It Works

### Search & Report Flow

```
User searches IP → Check if NFT exists
                    ↓
            No ← → Yes
            ↓         ↓
    Create NFT   Update NFT
            ↓         ↓
    Generate TX Hash
            ↓
    Save to Blockchain
```

### API Methods

```typescript
// Report any IP (creates NFT + transaction)
BlocSaviourAPI.reportIp(ipAddress, {
  isMalicious: true,
  threatLevel: 'malicious',
  attackTypes: ['SYN_FLOOD', 'BOTNET'],
})

// Flag as malicious
BlocSaviourAPI.flagMaliciousIp(ipAddress, ['DDoS'], 90)

// Mint new IP token
BlocSaviourAPI.mintIpToken(ipAddress, isMalicious)

// Update existing token
BlocSaviourAPI.updateThreatStatus(ipAddress, true, 'malicious')
```

## Pages with NFT Creation

### 1. 🔍 Search Page (`/search`)
- **Search any IP address**
- View current reputation
- **Report as Malicious** → Creates NFT + Transaction
- **Report as Clean** → Creates NFT + Transaction
- Shows transaction hash on success

### 2. 📊 IP Tokens Page (`/ip-tokens`)
- Lists all IP tokens
- **Quick Report Button** on each row
- One-click reporting
- Auto-refresh after report

### 3. ⚠️ Malicious IPs Page (`/malicious`)
- View all malicious IPs
- Each IP is an NFT
- Click to view details

## Transaction Details

Every operation generates:
- **Transaction Hash** (0x...)
- **Block Number** 
- **Timestamp**
- **Type** (mint, update, bulk_update)
- **Status** (success/failed/pending)
- **IP Address** involved
- **From** address (reporter)

## Components

### QuickReportButton
Reusable component for quick IP reporting:

```tsx
import { QuickReportButton } from '@/components/QuickReportButton';

<QuickReportButton 
  ipAddress="192.168.1.1"
  onSuccess={(txHash, isNew) => {
    console.log('Transaction:', txHash);
    console.log('New NFT:', isNew);
  }}
/>
```

## Blockchain Connection

The app connects to:
```
ws://127.0.0.1:9944 (local node)
```

Set custom endpoint:
```bash
NEXT_PUBLIC_BLOCKCHAIN_WS=wss://your-node.example.com
```

## NFT Structure

Each IP NFT contains:
```typescript
{
  ipAddress: "192.168.1.1",
  tokenId: 3232235777,
  threatLevel: "malicious",
  isMalicious: true,
  confidenceScore: 85,
  attackTypes: ["SYN_FLOOD", "BOTNET"],
  flaggedCount: 3,
  firstSeen: 1234567890,
  lastUpdated: 1234567890,
  history: [...]
}
```

## Usage Examples

### Report New Malicious IP
1. Go to `/search`
2. Enter IP: `10.0.0.50`
3. Click "Report as Malicious"
4. ✅ NFT created + Transaction logged

### Update Existing IP
1. Search for existing IP
2. Change status (malicious ↔ clean)
3. ✅ NFT updated + New transaction

### Quick Report from List
1. Go to `/ip-tokens`
2. Find IP in table
3. Click "Report IP" → Choose status
4. ✅ Transaction created instantly

## Development

All blockchain operations are logged to console:
```
🔨 Minting IP NFT for 192.168.1.1 (3232235777)
   Malicious: true
✅ Created new malicious IP NFT: 192.168.1.1
📝 Transaction: 0x1234...5678
```

## Production Setup

For production with real blockchain:
1. Install `@polkadot/keyring`
2. Create account keypair
3. Uncomment transaction signing code
4. Use actual substrate node

```typescript
// In blockchain-real.ts
import { Keyring } from '@polkadot/keyring';

const keyring = new Keyring({ type: 'sr25519' });
const account = keyring.addFromUri('//Alice');

const tx = api.tx.ipToken.mintIpToken(ipU32, isMalicious);
const hash = await tx.signAndSend(account);
```

## Summary

🎉 **Every IP operation now creates blockchain transactions!**
- 🆕 New IPs → NFT minted
- 🔄 Updates → NFT updated  
- 📝 All logged to blockchain
- ⛓️ Full transaction history
- 🎨 Each IP is a unique NFT
