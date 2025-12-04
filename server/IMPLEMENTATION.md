# BlocSaviour Python Server - Implementation Summary

## What Was Changed

The Python server has been updated to work with your **custom BlocSaviour blockchain** instead of a generic Substrate blockchain.

## Key Updates

### 1. **Custom Type Registry** (`app.py`)
Added BlocSaviour-specific type definitions:
- `ThreatLevel` enum: Unknown, Clean, Suspicious, Malicious, Rehabilitated
- `AttackType` enum: SynFlood, UdpFlood, HttpFlood, Botnet, PortScan, etc.
- `IpTokenData` struct matching your blockchain pallet

### 2. **Correct Pallet Integration**
Now uses your IpToken pallet with the correct functions:
- `mint_ip_token(ip_address)` - Creates new IP NFT
- `update_threat_status(ip_address, threat_level, confidence, attack_type)` - Updates existing NFT

### 3. **Block Subscription**
Added real-time blockchain monitoring:
- Subscribes to new blocks
- Tracks IpToken transactions
- Updates transaction history

### 4. **Threat Analysis**
Matches BlocSaviour ThreatLevel enum:
- Returns `Clean`, `Suspicious`, `Malicious` instead of generic levels
- Properly maps to blockchain enum values

### 5. **Non-blocking NFT Creation**
Uses background threads instead of asyncio for better Flask compatibility

## File Structure

```
/home/sonu/saviour/server/
├── .venv/              # Python virtual environment
├── app.py              # Main server application (UPDATED)
├── requirements.txt    # Python dependencies
├── start.sh            # Quick start script (NEW)
├── run.sh              # Run script
├── test_server.py      # Test script (NEW)
└── README.md           # Documentation (UPDATED)
```

## How to Use

### 1. Start BlocSaviour Blockchain
```bash
cd /home/sonu/saviour/bloc-saviour
./start.sh  # or your blockchain start command
```

### 2. Start Python Server
```bash
cd /home/sonu/saviour/server
./start.sh
```

Or manually:
```bash
source .venv/bin/activate
python app.py
```

### 3. Test the Server
```bash
python test_server.py
```

### 4. Make requests
Every HTTP request to the server will:
1. Log the request
2. Analyze threat level
3. Create/update IP NFT on BlocSaviour blockchain
4. Return response

## API Endpoints

All endpoints remain the same:
- `GET /api/stats` - Server statistics
- `GET /api/nfts` - All IP NFTs
- `GET /api/nft/<ip>` - Specific IP NFT
- `GET /api/transactions` - Blockchain transactions
- `GET /api/blockchain/status` - Blockchain connection status
- `GET /api/logs` - Request logs

## Integration with BlocSaviour

The server now correctly interfaces with:

### IpToken Pallet
Located at: `/home/sonu/saviour/bloc-saviour/pallets/ip-token/`

**Storage:**
- `IpTokens` - Map of IP address (u32) → IpTokenData
- `WhitelistedIps` - Whitelisted IPs
- `NextTokenId` - Token counter
- `TotalTokens` - Total minted tokens

**Functions Used:**
- `mint_ip_token(ip_address: u32)` - Mints new IP token
- `update_threat_status(ip_address: u32, threat_level: ThreatLevel, confidence: u8, attack_type: Option<AttackType>)` - Updates threat info

### Runtime Configuration
Located at: `/home/sonu/saviour/bloc-saviour/runtime/src/configs/mod.rs`

**Parameters:**
- `MaxBulkUpdate: 10,000` - Max IPs in bulk update
- `ConfidenceThreshold: 75` - Auto-flagging threshold

## Differences from Original Node.js Server

| Feature | Node.js | Python |
|---------|---------|--------|
| Framework | Express | Flask |
| Blockchain Client | @polkadot/api | substrate-interface |
| Async Handling | async/await | Threading |
| Type Registry | Built-in | Custom defined |
| Block Subscription | Native | Thread-based |

## Troubleshooting

**"Blockchain not available"**
- Check if BlocSaviour node is running
- Verify WebSocket endpoint: `ws://127.0.0.1:9944`
- Ensure IpToken pallet is compiled in runtime

**"Error creating NFT"**
- Ensure Alice account has balance
- Check blockchain logs for errors
- Verify pallet function signatures match

**Type errors**
- The custom type registry may need adjustment based on your exact blockchain version
- Check substrate-interface version compatibility

## Next Steps

1. **Start blockchain**: `cd bloc-saviour && ./start.sh`
2. **Start server**: `cd server && ./start.sh`
3. **Test**: Open browser to `http://localhost:8080`
4. **Monitor**: Check `/api/stats` for NFT creation

## Notes

- Server runs on port 8080 by default
- Uses Alice account (`//Alice`) for signing transactions
- NFT creation happens in background (non-blocking)
- All blockchain operations are thread-safe with locks
- Automatic reconnection on blockchain disconnect
