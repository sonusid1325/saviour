# BlocSaviour Python Server

Python implementation of the BlocSaviour Network Monitor Server with IP NFT creation on the BlocSaviour blockchain.

## Overview

This server monitors incoming HTTP requests and automatically creates IP NFTs on the BlocSaviour blockchain for threat tracking and DDoS prevention. Each IP address is tokenized with threat level analysis and stored on-chain.

## Setup

1. The virtual environment is already created in `.venv`
2. Install dependencies:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

### Prerequisites
Make sure your BlocSaviour blockchain node is running at `ws://127.0.0.1:9944` (or set `BLOCKCHAIN_WS` environment variable)

### Using the run script:
```bash
./run.sh
```

### Manual run:
```bash
source .venv/bin/activate
python app.py
```

## Environment Variables

- `BLOCKCHAIN_WS`: WebSocket endpoint for the BlocSaviour blockchain (default: `ws://127.0.0.1:9944`)

## API Endpoints

- `GET /api/stats` - Get server statistics
- `GET /api/logs` - Get request logs (supports filtering and pagination)
- `GET /api/nfts` - Get all IP NFTs
- `GET /api/nft/<ip>` - Get NFT for specific IP address
- `GET /api/transactions` - Get blockchain transactions
- `GET /api/blockchain/status` - Get blockchain connection status
- `GET /api/logs/export` - Export logs to JSON file
- `POST /api/stats/reset` - Reset statistics

## Features

- **Flask-based REST API** server with CORS support
- **Automatic IP NFT Creation** - Every incoming request triggers NFT minting on BlocSaviour blockchain
- **Threat Level Analysis** - Analyzes request patterns to determine threat levels:
  - `Clean` - Normal traffic
  - `Suspicious` - Potentially malicious patterns
  - `Malicious` - Confirmed threats
  - `Unknown` - Unanalyzed traffic
- **Attack Type Detection** - Identifies attack patterns (HttpFlood, PortScan, etc.)
- **Request Logging** - Comprehensive logging with statistics
- **Blockchain Integration** - Uses substrate-interface to connect to BlocSaviour chain
- **Real-time Block Subscription** - Monitors blockchain for new blocks and transactions

## BlocSaviour Blockchain Integration

This server interacts with the following BlocSaviour pallets:

### IpToken Pallet
- `mint_ip_token(ip_address)` - Creates new IP NFT
- `update_threat_status(ip_address, threat_level, confidence, attack_type)` - Updates existing NFT

### ThreatLevel Enum
- `Unknown` - Initial state
- `Clean` - Verified safe traffic
- `Suspicious` - Potential threat
- `Malicious` - Confirmed malicious
- `Rehabilitated` - Previously malicious, now clean

### AttackType Enum
- `SynFlood`, `UdpFlood`, `HttpFlood`, `Botnet`, `PortScan`
- `DnsAmplification`, `SlowLoris`, `IcmpFlood`, `Smurf`, `Other`

## How It Works

1. **Request arrives** → Server logs the request and extracts IP address
2. **Threat Analysis** → Analyzes user agent and request data for suspicious patterns
3. **NFT Creation/Update** → Calls `update_threat_status` which:
   - **Auto-mints** the IP token if it doesn't exist
   - Updates threat metadata (level, confidence, attack type)
4. **Blockchain Storage** → NFT data is stored on-chain with immutable timestamp
5. **Statistics** → Updates in-memory stats for real-time dashboard

**Note:** The `update_threat_status` pallet function has built-in auto-mint functionality, so only ONE blockchain transaction is needed per IP (whether new or existing). This is more efficient than the original Node.js implementation!

## Dependencies

- Flask 3.0.0 - Web framework
- Flask-CORS 4.0.0 - CORS support
- substrate-interface 1.7.4 - Substrate/Polkadot blockchain client

## Notes

This is a Python port of the original Node.js Express server located at `/ddos/server/app.js`. 
It maintains the same API endpoints and functionality while using Python and Flask framework, with full integration to the BlocSaviour custom blockchain pallets.

## Troubleshooting

**Blockchain connection failed:**
- Ensure BlocSaviour node is running: `./start.sh` in bloc-saviour directory
- Check WebSocket endpoint: `ws://127.0.0.1:9944`
- Verify node is synced and producing blocks

**NFT creation errors:**
- Check Alice account has sufficient balance
- Verify IpToken pallet is configured in runtime
- Check logs for specific error messages
