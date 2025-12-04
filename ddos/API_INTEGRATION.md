# API Integration for Threat Detection

## Summary

Successfully migrated the server from local ML model to API-powered threat detection.

## Changes Made

### 1. Updated `server/app.js`

**Removed:**
- TensorFlow.js imports and dependencies
- Local ML model loading (`loadMLModel()`)
- Feature extraction function (`extractFeatures()`)
- Local ML prediction function (`predictThreat()`)
- Rule-based threat detection (`detectThreat()`)

**Added:**
- Axios for HTTP requests
- `fetchThreatAnalysis(ip)` - Fetches threat data from API
- Threat cache with 5-minute TTL
- New stats: `apiCalls`, `apiErrors`

**Modified:**
- Middleware now ONLY calls `fetchThreatAnalysis()` - no local analysis
- IPs not in API are marked as 'unknown'
- Stats endpoint shows API connection status
- Logs include threat source ('api' or 'none')

### 2. Configuration

**Environment Variables:**
- `THREATS_API` - API endpoint (default: `http://10.9.3.147:5050/threats`)
- `BLOCKCHAIN_WS` - Blockchain node (default: `ws://127.0.0.1:9944`)

### 3. How It Works

1. **Request received** → Server extracts client IP
2. **API call** → Checks threat cache, then calls threats API
3. **Threat found?**
   - Yes → Use API threat data
   - No → Mark as 'unknown' (no local analysis)
4. **Create/Update NFT** → Mint IP token on blockchain
5. **Update metadata** → Record threat level, attack types from API

## API Response Format

```json
{
  "threats": [
    {
      "target_ip": "2.16.106.207",
      "attack_type": "UDP FLOOD",
      "threat_level": "malicious",
      "ml_action": "BLOCK",
      "timestamp": "2025-12-04 02:24:08"
    }
  ]
}
```

## Server Response

The server now:
- ✅ Fetches threat analysis ONLY from API
- ✅ Creates IP_TOKENS for all IPs
- ✅ Updates blockchain metadata with API threat info
- ✅ Caches API responses (5 min TTL)
- ✅ Marks unknown IPs as 'unknown' (no local guessing)

## Usage

```bash
# Start the server
npm run server

# Test endpoint
curl http://localhost:8080/api/stats

# Check logs
curl http://localhost:8080/api/logs

# View NFTs
curl http://localhost:8080/api/nfts
```

## Stats Output

```json
{
  "nftsCreated": 1,
  "apiCalls": 1,
  "apiErrors": 0,
  "threatAPIConnected": true,
  "blockchainConnected": true
}
```

## Benefits

1. **Centralized ML** - One API analyzes all traffic
2. **No local analysis** - Server trusts API completely
3. **Cached responses** - Better performance
4. **Simple architecture** - No duplicate logic
5. **Real-time sync** - Always uses latest threat intelligence from API
