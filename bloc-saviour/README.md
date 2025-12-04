# Bloc Saviour - DDoS Prevention Blockchain

A Substrate-based blockchain for DDoS prevention and IP reputation management using NFT-like IP tokens.

## Overview

Bloc Saviour is a private/permissioned blockchain built with the Polkadot SDK that provides:
- **IP Token Management**: Each IP address is represented as an NFT-like token with immutable and mutable metadata
- **Threat Tracking**: Real-time threat status updates with confidence scoring
- **Attack History**: Complete audit trail of all IP status changes
- **Bulk Operations**: Efficient batch updates for botnet detection (up to 10,000 IPs)
- **Access Control**: Only authorized AI nodes can flag IPs
- **Whitelist Management**: Permanent whitelist for known-good IPs

## Architecture

### Core Components

1. **IP Token Pallet** (`pallets/ip-token`)
   - Lazy minting of IP tokens
   - Threat status management (Unknown, Clean, Suspicious, Malicious, Rehabilitated)
   - Attack type tracking (SYN Flood, UDP Flood, HTTP Flood, Botnet, etc.)
   - Confidence scoring (0-100)
   - History tracking (last 10 status changes)
   - Bulk update operations

2. **Access Control Pallet** (`pallets/access-control`)
   - Authorized node management
   - Admin role management
   - Permission verification for threat updates

3. **Runtime** (`runtime`)
   - Integrates all pallets
   - Configured for high throughput (1000+ TPS target)
   - 6-second block time
   - Aura consensus with GRANDPA finality

### IP Token Data Structure

Each IP token contains:

**Immutable Fields:**
- IP address (u32)
- First seen timestamp
- Unique token ID

**Mutable Fields:**
- Threat level (enum)
- Malicious flag (bool)
- Confidence score (0-100)
- Attack types (list)
- Last updated timestamp
- Flagged count
- False positive count
- History buffer (10 entries)

### Storage Layout

- **IpTokens**: `StorageMap<u32, IpTokenData>` - Main token storage (~216 bytes per token)
- **WhitelistedIps**: `StorageMap<u32, bool>` - Whitelist cache
- **TotalTokens**: `u64` - Global token counter
- **MaliciousCount**: `u32` - Count of currently malicious IPs
- **NextTokenId**: `u64` - Token ID generator

### Performance Characteristics

- **Target TPS**: 1,000 transactions per second
- **Block Time**: 6 seconds
- **Bulk Update Limit**: 10,000 IPs per transaction
- **Storage per IP**: ~216 bytes (optimized with BoundedVec)
- **Scale**: Supports 10M+ IP tokens

## Project Structure

```
bloc-saviour/
├── Cargo.toml              # Workspace configuration
├── node/                   # Blockchain node implementation
├── runtime/                # Runtime configuration
│   └── src/
│       ├── lib.rs         # Runtime assembly
│       └── configs/       # Pallet configurations
├── pallets/
│   ├── ip-token/          # IP Token pallet (main functionality)
│   │   └── src/
│   │       ├── lib.rs     # Pallet implementation
│   │       ├── mock.rs    # Test mock runtime
│   │       ├── tests.rs   # Unit tests
│   │       ├── weights.rs # Weight calculations
│   │       └── benchmarking.rs
│   ├── access-control/    # Access Control pallet
│   │   └── src/lib.rs
│   └── template/          # Original template (reference)
└── README.md
```

## Building the Project

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Update Rust nightly (required for Substrate)
rustup update nightly
rustup target add wasm32-unknown-unknown --toolchain nightly
```

### Build Steps

The project is designed to work within the polkadot-sdk workspace:

```bash
# Ensure polkadot-sdk is in parent directory
cd /home/sonu/saviour
ls polkadot-sdk  # Should exist

# Build the runtime
cd bloc-saviour/runtime
cargo build --release

# Build specific pallets for testing
cd ../pallets/ip-token
cargo test

cd ../access-control  
cargo test
```

## Testing

### Run Unit Tests

```bash
# Test IP Token pallet
cd pallets/ip-token
cargo test

# Expected tests:
# ✓ test_mint_ip_token
# ✓ test_update_threat_status
# ✓ test_auto_mint_on_update
# ✓ test_bulk_update
# ✓ test_whitelist
# ✓ test_rehabilitate_ip
# ✓ test_invalid_confidence
# ✓ test_history_tracking
# ✓ test_attack_types
# ✓ test_false_positive_tracking
# ✓ test_malicious_counter
```

## Interacting with the Blockchain

### Using Polkadot.js Apps

1. Navigate to [https://polkadot.js.org/apps](https://polkadot.js.org/apps)
2. Connect to local node: `ws://127.0.0.1:9944`
3. Go to Developer > Extrinsics

### Example Operations

#### 1. Mint an IP Token

```javascript
// Extrinsic: ipToken.mintIpToken(ip_address)
// IP: 192.168.1.1 = 3232235777 (0xC0A80101)

ipToken.mintIpToken(3232235777)
```

#### 2. Update Threat Status

```javascript
// Extrinsic: ipToken.updateThreatStatus(ip, threat_level, confidence, attack_type)

ipToken.updateThreatStatus(
  3232235777,                    // IP address
  { Malicious: null },           // Threat level
  95,                            // Confidence (0-100)
  { Some: { SynFlood: null } }   // Attack type
)
```

#### 3. Bulk Update (Botnet Detection)

```javascript
// Extrinsic: ipToken.bulkUpdateThreats(updates)

ipToken.bulkUpdateThreats([
  {
    ip_address: 3232235777,
    threat_level: { Malicious: null },
    confidence: 90,
    attack_type: { Some: { Botnet: null } }
  },
  {
    ip_address: 3232235778,
    threat_level: { Malicious: null },
    confidence: 85,
    attack_type: { Some: { Botnet: null } }
  },
  // ... up to 10,000 entries
])
```

## IP Address Conversion

### Python Helper Functions

```python
def ip_to_u32(ip_string):
    """Convert dotted IP to u32"""
    parts = ip_string.split('.')
    return (int(parts[0]) << 24) + (int(parts[1]) << 16) + \
           (int(parts[2]) << 8) + int(parts[3])

def u32_to_ip(num):
    """Convert u32 to dotted IP"""
    return f"{(num >> 24) & 0xFF}.{(num >> 16) & 0xFF}." \
           f"{(num >> 8) & 0xFF}.{num & 0xFF}"

# Examples:
print(ip_to_u32("192.168.1.1"))    # 3232235777
print(u32_to_ip(3232235777))        # "192.168.1.1"
```

### JavaScript Helper Functions

```javascript
function ipToU32(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function u32ToIp(num) {
  return [
    (num >> 24) & 0xFF,
    (num >> 16) & 0xFF,
    (num >> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

// Examples:
console.log(ipToU32("192.168.1.1"));  // 3232235777
console.log(u32ToIp(3232235777));     // "192.168.1.1"
```

## Integration with AI Systems

### Python Integration Example

```python
from substrateinterface import SubstrateInterface, Keypair

# Connect to node
substrate = SubstrateInterface(
    url="ws://127.0.0.1:9944",
    ss58_format=42,
    type_registry_preset='substrate-node-template'
)

# Load AI node keypair (must be authorized)
keypair = Keypair.create_from_uri('//Alice')

# Convert IP to u32
def ip_to_u32(ip_string):
    parts = ip_string.split('.')
    return (int(parts[0]) << 24) + (int(parts[1]) << 16) + \
           (int(parts[2]) << 8) + int(parts[3])

# Flag IP as malicious
def flag_ip_threat(ip_address_str, confidence, attack_type='Botnet'):
    ip_u32 = ip_to_u32(ip_address_str)
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='update_threat_status',
        call_params={
            'ip_address': ip_u32,
            'threat_level': 'Malicious',
            'confidence': confidence,
            'attack_type': attack_type
        }
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    print(f"✓ Flagged {ip_address_str} - Hash: {receipt.extrinsic_hash}")
    return receipt

# Bulk update for botnet detection
def flag_botnet(ip_list, confidence=90):
    """Flag multiple IPs as part of a botnet"""
    updates = [
        {
            'ip_address': ip_to_u32(ip),
            'threat_level': 'Malicious',
            'confidence': confidence,
            'attack_type': 'Botnet'
        }
        for ip in ip_list
    ]
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='bulk_update_threats',
        call_params={'updates': updates}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    print(f"✓ Bulk flagged {len(ip_list)} IPs - Hash: {receipt.extrinsic_hash}")
    return receipt

# Query IP reputation
def get_ip_reputation(ip_address_str):
    ip_u32 = ip_to_u32(ip_address_str)
    result = substrate.query(
        module='IpToken',
        storage_function='IpTokens',
        params=[ip_u32]
    )
    return result.value

# Example usage
if __name__ == "__main__":
    # Flag single IP
    flag_ip_threat("192.168.1.100", confidence=95, attack_type='SynFlood')
    
    # Flag botnet
    botnet_ips = ["10.0.0.1", "10.0.0.2", "10.0.0.3"]
    flag_botnet(botnet_ips)
    
    # Check reputation
    rep = get_ip_reputation("192.168.1.100")
    if rep:
        print(f"Threat Level: {rep['threat_level']}")
        print(f"Confidence: {rep['confidence_score']}")
        print(f"Flagged Count: {rep['flagged_count']}")
```

### Event Monitoring

```python
def monitor_threats():
    """Subscribe to blockchain events and monitor threats in real-time"""
    
    def event_handler(obj, update_nr, subscription_id):
        block_num = obj['header']['number']
        print(f"\n📦 Block #{block_num}")
        
        for event in obj['events']:
            if event['module_id'] == 'IpToken':
                event_id = event['event_id']
                attrs = event['attributes']
                
                if event_id == 'TokenMinted':
                    ip = u32_to_ip(attrs['ip_address'])
                    print(f"  🆕 New IP: {ip}")
                
                elif event_id == 'ThreatDetected':
                    ip = u32_to_ip(attrs['ip_address'])
                    threat = attrs['threat_level']
                    attack = attrs.get('attack_type', 'Unknown')
                    print(f"  ⚠️  THREAT: {ip} - {threat} ({attack})")
                
                elif event_id == 'BulkUpdateCompleted':
                    count = attrs['count']
                    print(f"  📊 Bulk update: {count} IPs processed")
    
    print("🔍 Monitoring blockchain for threats...")
    substrate.subscribe_block_headers(event_handler)

# Run monitor
monitor_threats()
```

## API Reference

### Extrinsics (Transactions)

#### IP Token Pallet

| Function | Parameters | Description |
|----------|------------|-------------|
| `mintIpToken` | `ip_address: u32` | Create new IP token (lazy minting) |
| `updateThreatStatus` | `ip: u32, threat_level, confidence: u8, attack_type` | Update IP threat classification |
| `bulkUpdateThreats` | `updates: Vec<BulkUpdateEntry>` | Batch update multiple IPs (max 10k) |
| `rehabilitateIp` | `ip_address: u32` | Mark IP as rehabilitated |
| `addToWhitelist` | `ip_address: u32` | Add IP to permanent whitelist (root only) |
| `removeFromWhitelist` | `ip_address: u32` | Remove IP from whitelist (root only) |
| `markFalsePositive` | `ip_address: u32` | Increment false positive counter |

#### Access Control Pallet

| Function | Parameters | Description |
|----------|------------|-------------|
| `authorizeNode` | `account_id` | Add node to authorized list (admin/root) |
| `deauthorizeNode` | `account_id` | Remove node from authorized list |
| `addAdmin` | `account_id` | Add admin account (root only) |
| `removeAdmin` | `account_id` | Remove admin account (root only) |

### Storage Queries

| Query | Returns | Description |
|-------|---------|-------------|
| `ipTokens(ip: u32)` | `Option<IpTokenData>` | Get complete IP token data |
| `whitelistedIps(ip: u32)` | `bool` | Check if IP is whitelisted |
| `totalTokens()` | `u64` | Total number of minted tokens |
| `maliciousCount()` | `u32` | Current count of malicious IPs |
| `nextTokenId()` | `u64` | Next token ID to be assigned |

### Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `TokenMinted` | `ip_address, token_id, block_number` | New IP token created |
| `ThreatDetected` | `ip_address, threat_level, attack_type` | Threat identified |
| `StatusUpdated` | `ip_address, old_status, new_status, confidence` | IP status changed |
| `BulkUpdateCompleted` | `count, block_number` | Bulk operation finished |
| `IpRehabilitated` | `ip_address` | IP marked as clean |
| `IpWhitelisted` | `ip_address` | IP added to whitelist |
| `IpRemovedFromWhitelist` | `ip_address` | IP removed from whitelist |
| `AttackTypeAdded` | `ip_address, attack_type` | New attack type detected |

## Configuration Parameters

### Runtime Configuration (`runtime/src/configs/mod.rs`)

```rust
parameter_types! {
    // Maximum IPs in single bulk update
    pub const MaxBulkUpdate: u32 = 10_000;
    
    // Confidence threshold for auto-flagging (0-100)
    pub const ConfidenceThreshold: u8 = 75;
}
```

### Block Time (`runtime/src/lib.rs`)

```rust
pub const MILLI_SECS_PER_BLOCK: u64 = 6000;  // 6 seconds
```

### Storage Limits (`pallets/ip-token/src/lib.rs`)

```rust
pub const MAX_ATTACK_TYPES: u32 = 10;   // Max attack types per IP
pub const MAX_HISTORY_SIZE: u32 = 10;    // Max history entries per IP
pub const MAX_BULK_UPDATE: u32 = 10_000; // Max IPs per bulk update
```

## Performance Metrics

### Expected Performance

- **Block Production**: 6 second block time
- **Finality**: ~12 seconds (2 blocks via GRANDPA)
- **Transaction Throughput**: 1,000+ TPS (target)
- **Bulk Update Processing**: 10,000 IPs in <10 seconds
- **Query Latency**: Sub-second for storage reads
- **Storage Efficiency**: ~216 bytes per IP token

### Benchmarks

```bash
# Run benchmarks (once node is built)
cargo test --package pallet-ip-token --features runtime-benchmarks

# Expected results:
# - mint_ip_token: ~10ms
# - update_threat_status: ~20ms
# - bulk_update_threats (1000 IPs): ~15s
# - rehabilitate_ip: ~15ms
```

## Security Considerations

1. **Access Control**: Only authorized nodes can update threat status
2. **Whitelist Protection**: Whitelisted IPs cannot be flagged
3. **Audit Trail**: All changes permanently recorded
4. **Input Validation**: Confidence scores validated (0-100)
5. **Spam Prevention**: Consider rate limiting in production
6. **Root Operations**: Critical functions require sudo/root
7. **History Integrity**: Immutable audit log

## Deployment Checklist

- [ ] Generate chain specification
- [ ] Configure genesis block with authorized nodes
- [ ] Set up validator nodes (Aura authorities)
- [ ] Configure GRANDPA authorities for finality
- [ ] Deploy monitoring infrastructure
- [ ] Set up backup and recovery procedures
- [ ] Configure firewalls for p2p networking
- [ ] Establish key management procedures
- [ ] Set up log aggregation
- [ ] Deploy AI integration services

## Future Enhancements

- [ ] IPv6 support (change storage to u128)
- [ ] Cross-chain reputation sharing (XCMP)
- [ ] ML model versioning in metadata
- [ ] Geo-location tracking
- [ ] ASN (Autonomous System Number) association
- [ ] Reputation scoring algorithm
- [ ] Off-chain workers for auto-rehabilitation
- [ ] GraphQL API for complex queries
- [ ] WebSocket event streams
- [ ] SIEM system integration
- [ ] Prometheus metrics exporter
- [ ] Dashboard UI

## Troubleshooting

### Build Issues

```bash
# Clean build
cargo clean
cargo build --release

# Update dependencies
cargo update

# Check Rust version
rustc --version  # Should be 1.70+
```

### Runtime Issues

```bash
# Purge chain database
./target/release/node-template purge-chain --dev

# Check logs
./target/release/node-template --dev --log=runtime=debug
```

## License

Unlicense - Free and open source

## Credits

Built with:
- [Polkadot SDK](https://github.com/paritytech/polkadot-sdk) (stable2409)
- [Substrate](https://substrate.io/)
- FRAME v2 macros
- Rust programming language

## Contact

For technical questions, refer to:
- [Substrate Documentation](https://docs.substrate.io/)
- [Polkadot SDK Repository](https://github.com/paritytech/polkadot-sdk)

---

**⚠️ Production Notice**: This blockchain is designed for private/permissioned networks. Conduct thorough security audits and load testing before production deployment.
