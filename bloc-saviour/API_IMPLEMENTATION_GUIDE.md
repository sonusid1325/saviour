# Bloc Saviour - Complete API Implementation Guide

**Version:** 1.0  
**Last Updated:** December 2024  
**Blockchain:** Substrate-based (Polkadot SDK stable2409)  
**Consensus:** Aura + GRANDPA  

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Connection Setup](#connection-setup)
3. [Extrinsics (Write Operations)](#extrinsics-write-operations)
4. [Queries (Read Operations)](#queries-read-operations)
5. [Events](#events)
6. [Data Structures](#data-structures)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)
9. [Performance & Limits](#performance--limits)
10. [Best Practices](#best-practices)

---

## API Overview

Bloc Saviour provides a blockchain-based IP reputation system with the following capabilities:

- **IP Token Management**: NFT-like tokens for each IP address
- **Threat Tracking**: Real-time threat status with confidence scoring
- **Attack Classification**: Multiple attack type detection
- **Bulk Operations**: Process up to 10,000 IPs in a single transaction
- **Whitelist Management**: Permanent protection for trusted IPs
- **Audit Trail**: Immutable history of all status changes

### API Endpoints

| Type | Access Method | Description |
|------|--------------|-------------|
| **WebSocket** | `ws://127.0.0.1:9944` | Real-time blockchain connection |
| **HTTP RPC** | `http://127.0.0.1:9933` | HTTP JSON-RPC interface |
| **Polkadot.js** | Browser/Node.js SDK | TypeScript/JavaScript library |
| **Substrate API** | Python `substrate-interface` | Python integration |

---

## Connection Setup

### JavaScript/TypeScript (Polkadot.js)

```javascript
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

// Connect to local node
async function connectToBlockchain() {
  const wsProvider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider: wsProvider });
  
  await api.isReady;
  console.log('✓ Connected to Bloc Saviour blockchain');
  console.log(`Chain: ${await api.rpc.system.chain()}`);
  console.log(`Node: ${await api.rpc.system.name()} v${await api.rpc.system.version()}`);
  
  return api;
}

// Create keypair for signing transactions
function createKeypair() {
  const keyring = new Keyring({ type: 'sr25519' });
  
  // Development accounts (DO NOT use in production)
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  
  // Or from mnemonic
  // const account = keyring.addFromMnemonic('your twelve word mnemonic phrase here');
  
  return { alice, bob };
}

// Example usage
(async () => {
  const api = await connectToBlockchain();
  const { alice } = createKeypair();
  
  // Your code here
  
  await api.disconnect();
})();
```

### Python (substrate-interface)

```python
from substrateinterface import SubstrateInterface, Keypair

# Connect to blockchain
def connect_to_blockchain():
    substrate = SubstrateInterface(
        url="ws://127.0.0.1:9944",
        ss58_format=42,
        type_registry_preset='substrate-node-template'
    )
    
    print(f"✓ Connected to {substrate.chain}")
    print(f"  Node: {substrate.name} v{substrate.version}")
    
    return substrate

# Create keypair
def create_keypair():
    # Development account (DO NOT use in production)
    keypair = Keypair.create_from_uri('//Alice')
    
    # Or from mnemonic
    # keypair = Keypair.create_from_mnemonic('your twelve word mnemonic phrase here')
    
    print(f"Account: {keypair.ss58_address}")
    return keypair

# Example usage
if __name__ == "__main__":
    substrate = connect_to_blockchain()
    alice = create_keypair()
    
    # Your code here
```

### IP Address Conversion Utilities

```javascript
// JavaScript/TypeScript
function ipToU32(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function u32ToIp(num) {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

// Examples
console.log(ipToU32("192.168.1.1"));    // 3232235777
console.log(u32ToIp(3232235777));       // "192.168.1.1"
console.log(ipToU32("8.8.8.8"));        // 134744072
console.log(ipToU32("127.0.0.1"));      // 2130706433
```

```python
# Python
def ip_to_u32(ip_string):
    """Convert dotted IP string to u32 integer"""
    parts = ip_string.split('.')
    return (int(parts[0]) << 24) + (int(parts[1]) << 16) + \
           (int(parts[2]) << 8) + int(parts[3])

def u32_to_ip(num):
    """Convert u32 integer to dotted IP string"""
    return f"{(num >> 24) & 0xFF}.{(num >> 16) & 0xFF}." \
           f"{(num >> 8) & 0xFF}.{num & 0xFF}"

# Examples
print(ip_to_u32("192.168.1.1"))    # 3232235777
print(u32_to_ip(3232235777))       # "192.168.1.1"
print(ip_to_u32("8.8.8.8"))        # 134744072
print(ip_to_u32("127.0.0.1"))      # 2130706433
```

---

## Extrinsics (Write Operations)

### 1. Mint IP Token

Creates a new IP token with default values.

**Function:** `ipToken.mintIpToken(ip_address)`

**Parameters:**
- `ip_address`: `u32` - IP address as 32-bit unsigned integer

**Returns:** `DispatchResult`

**Errors:**
- `TokenAlreadyExists` - IP token already minted

**JavaScript Example:**

```javascript
async function mintIpToken(api, keypair, ipAddress) {
  const ipU32 = ipToU32(ipAddress);
  
  const tx = api.tx.ipToken.mintIpToken(ipU32);
  
  return new Promise((resolve, reject) => {
    tx.signAndSend(keypair, ({ status, events }) => {
      if (status.isInBlock) {
        console.log(`✓ Minted IP ${ipAddress}`);
        console.log(`  Block: ${status.asInBlock.toHex()}`);
        
        events.forEach(({ event: { data, method, section } }) => {
          if (section === 'ipToken' && method === 'TokenMinted') {
            const [ip, tokenId, blockNumber] = data;
            console.log(`  Token ID: ${tokenId}`);
          }
        });
        
        resolve(status.asInBlock);
      } else if (status.isFinalized) {
        console.log(`✓ Finalized in block ${status.asFinalized.toHex()}`);
      }
    }).catch(reject);
  });
}

// Usage
await mintIpToken(api, alice, "192.168.1.100");
```

**Python Example:**

```python
def mint_ip_token(substrate, keypair, ip_address_str):
    """Mint a new IP token"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='mint_ip_token',
        call_params={'ip_address': ip_u32}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    
    print(f"✓ Minted IP {ip_address_str}")
    print(f"  Block: #{receipt.block_number}")
    print(f"  Hash: {receipt.extrinsic_hash}")
    
    return receipt

# Usage
mint_ip_token(substrate, alice, "192.168.1.100")
```

---

### 2. Update Threat Status

Updates the threat level and confidence score for an IP. Auto-mints if token doesn't exist.

**Function:** `ipToken.updateThreatStatus(ip_address, threat_level, confidence, attack_type)`

**Parameters:**
- `ip_address`: `u32` - IP address
- `threat_level`: `ThreatLevel` - Enum: `Unknown`, `Clean`, `Suspicious`, `Malicious`, `Rehabilitated`
- `confidence`: `u8` - Confidence score (0-100)
- `attack_type`: `Option<AttackType>` - Optional attack classification

**Attack Types:**
- `SynFlood`
- `UdpFlood`
- `HttpFlood`
- `Botnet`
- `PortScan`
- `DnsAmplification`
- `SlowLoris`
- `IcmpFlood`
- `Smurf`
- `Other`

**Returns:** `DispatchResult`

**Errors:**
- `InvalidConfidence` - Confidence > 100
- `IpWhitelisted` - IP is whitelisted
- `AttackTypesExceeded` - Too many attack types (max 10)

**JavaScript Example:**

```javascript
async function updateThreatStatus(api, keypair, ipAddress, threatLevel, confidence, attackType = null) {
  const ipU32 = ipToU32(ipAddress);
  
  const tx = api.tx.ipToken.updateThreatStatus(
    ipU32,
    threatLevel,           // 'Malicious', 'Suspicious', etc.
    confidence,
    attackType            // 'SynFlood', 'Botnet', etc. or null
  );
  
  return new Promise((resolve, reject) => {
    tx.signAndSend(keypair, ({ status, events }) => {
      if (status.isInBlock) {
        console.log(`✓ Updated threat status for ${ipAddress}`);
        console.log(`  Level: ${threatLevel}`);
        console.log(`  Confidence: ${confidence}%`);
        if (attackType) console.log(`  Attack: ${attackType}`);
        
        events.forEach(({ event: { data, method, section } }) => {
          if (section === 'ipToken' && method === 'ThreatDetected') {
            console.log(`  🚨 Threat detected event emitted`);
          }
        });
        
        resolve(status.asInBlock);
      }
    }).catch(reject);
  });
}

// Usage examples
await updateThreatStatus(api, alice, "10.0.0.1", 'Malicious', 95, 'SynFlood');
await updateThreatStatus(api, alice, "10.0.0.2", 'Suspicious', 60, null);
await updateThreatStatus(api, alice, "10.0.0.3", 'Clean', 100, null);
```

**Python Example:**

```python
def update_threat_status(substrate, keypair, ip_address_str, threat_level, confidence, attack_type=None):
    """Update IP threat classification"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='update_threat_status',
        call_params={
            'ip_address': ip_u32,
            'threat_level': threat_level,
            'confidence': confidence,
            'attack_type': attack_type
        }
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    
    print(f"✓ Updated {ip_address_str}")
    print(f"  Level: {threat_level}")
    print(f"  Confidence: {confidence}%")
    if attack_type:
        print(f"  Attack: {attack_type}")
    
    return receipt

# Usage examples
update_threat_status(substrate, alice, "10.0.0.1", "Malicious", 95, "SynFlood")
update_threat_status(substrate, alice, "10.0.0.2", "Suspicious", 60, None)
update_threat_status(substrate, alice, "10.0.0.3", "Clean", 100, None)
```

---

### 3. Bulk Update Threats

Efficiently update multiple IPs in a single transaction (useful for botnet detection).

**Function:** `ipToken.bulkUpdateThreats(updates)`

**Parameters:**
- `updates`: `Vec<BulkUpdateEntry>` - Array of update entries (max 10,000)

**BulkUpdateEntry Structure:**
```rust
{
  ip_address: u32,
  threat_level: ThreatLevel,
  confidence: u8,
  attack_type: Option<AttackType>
}
```

**Returns:** `DispatchResult`

**Errors:**
- `BulkUpdateTooLarge` - More than 10,000 entries
- `InvalidConfidence` - Any confidence > 100

**JavaScript Example:**

```javascript
async function bulkUpdateThreats(api, keypair, ipList, threatLevel, confidence, attackType) {
  const updates = ipList.map(ip => ({
    ip_address: ipToU32(ip),
    threat_level: threatLevel,
    confidence: confidence,
    attack_type: attackType
  }));
  
  console.log(`Bulk updating ${updates.length} IPs...`);
  
  const tx = api.tx.ipToken.bulkUpdateThreats(updates);
  
  return new Promise((resolve, reject) => {
    tx.signAndSend(keypair, ({ status, events }) => {
      if (status.isInBlock) {
        console.log(`✓ Bulk update completed`);
        console.log(`  IPs processed: ${updates.length}`);
        console.log(`  Block: ${status.asInBlock.toHex()}`);
        
        events.forEach(({ event: { data, method, section } }) => {
          if (section === 'ipToken' && method === 'BulkUpdateCompleted') {
            const [count, blockNumber] = data;
            console.log(`  Actual count: ${count}`);
          }
        });
        
        resolve(status.asInBlock);
      }
    }).catch(reject);
  });
}

// Usage - flag botnet
const botnetIps = [
  "10.0.1.1",
  "10.0.1.2",
  "10.0.1.3",
  // ... up to 10,000 IPs
];

await bulkUpdateThreats(api, alice, botnetIps, 'Malicious', 90, 'Botnet');
```

**Python Example:**

```python
def bulk_update_threats(substrate, keypair, ip_list, threat_level, confidence, attack_type=None):
    """Bulk update multiple IPs at once"""
    updates = [
        {
            'ip_address': ip_to_u32(ip),
            'threat_level': threat_level,
            'confidence': confidence,
            'attack_type': attack_type
        }
        for ip in ip_list
    ]
    
    print(f"Bulk updating {len(updates)} IPs...")
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='bulk_update_threats',
        call_params={'updates': updates}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    
    print(f"✓ Bulk update completed")
    print(f"  IPs processed: {len(updates)}")
    print(f"  Block: #{receipt.block_number}")
    
    return receipt

# Usage - flag botnet
botnet_ips = [
    "10.0.1.1",
    "10.0.1.2",
    "10.0.1.3",
    # ... up to 10,000 IPs
]

bulk_update_threats(substrate, alice, botnet_ips, "Malicious", 90, "Botnet")
```

---

### 4. Rehabilitate IP

Mark a previously malicious IP as rehabilitated.

**Function:** `ipToken.rehabilitateIp(ip_address)`

**Parameters:**
- `ip_address`: `u32` - IP address

**Returns:** `DispatchResult`

**Errors:**
- `TokenNotFound` - IP token doesn't exist

**JavaScript Example:**

```javascript
async function rehabilitateIp(api, keypair, ipAddress) {
  const ipU32 = ipToU32(ipAddress);
  
  const tx = api.tx.ipToken.rehabilitateIp(ipU32);
  
  return new Promise((resolve, reject) => {
    tx.signAndSend(keypair, ({ status, events }) => {
      if (status.isInBlock) {
        console.log(`✓ Rehabilitated IP ${ipAddress}`);
        resolve(status.asInBlock);
      }
    }).catch(reject);
  });
}

// Usage
await rehabilitateIp(api, alice, "10.0.0.1");
```

**Python Example:**

```python
def rehabilitate_ip(substrate, keypair, ip_address_str):
    """Mark IP as rehabilitated"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='rehabilitate_ip',
        call_params={'ip_address': ip_u32}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    
    print(f"✓ Rehabilitated IP {ip_address_str}")
    return receipt

# Usage
rehabilitate_ip(substrate, alice, "10.0.0.1")
```

---

### 5. Whitelist Management (Root Only)

Add or remove IPs from permanent whitelist.

**Functions:**
- `ipToken.addToWhitelist(ip_address)` - Requires root/sudo
- `ipToken.removeFromWhitelist(ip_address)` - Requires root/sudo

**Parameters:**
- `ip_address`: `u32` - IP address

**JavaScript Example:**

```javascript
async function addToWhitelist(api, sudoKeypair, ipAddress) {
  const ipU32 = ipToU32(ipAddress);
  
  // Wrap in sudo call
  const tx = api.tx.sudo.sudo(
    api.tx.ipToken.addToWhitelist(ipU32)
  );
  
  return new Promise((resolve, reject) => {
    tx.signAndSend(sudoKeypair, ({ status, events }) => {
      if (status.isInBlock) {
        console.log(`✓ Added ${ipAddress} to whitelist`);
        resolve(status.asInBlock);
      }
    }).catch(reject);
  });
}

// Usage (requires sudo/root account)
await addToWhitelist(api, alice, "8.8.8.8");  // Google DNS
await addToWhitelist(api, alice, "1.1.1.1");  // Cloudflare DNS
```

**Python Example:**

```python
def add_to_whitelist(substrate, sudo_keypair, ip_address_str):
    """Add IP to whitelist (requires sudo)"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='add_to_whitelist',
        call_params={'ip_address': ip_u32}
    )
    
    # Wrap in sudo
    sudo_call = substrate.compose_call(
        call_module='Sudo',
        call_function='sudo',
        call_params={'call': call}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=sudo_call, keypair=sudo_keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    
    print(f"✓ Added {ip_address_str} to whitelist")
    return receipt

# Usage
add_to_whitelist(substrate, alice, "8.8.8.8")  # Google DNS
```

---

### 6. Mark False Positive

Increment false positive counter for an IP.

**Function:** `ipToken.markFalsePositive(ip_address)`

**Parameters:**
- `ip_address`: `u32` - IP address

**Returns:** `DispatchResult`

**Errors:**
- `TokenNotFound` - IP token doesn't exist

**JavaScript Example:**

```javascript
async function markFalsePositive(api, keypair, ipAddress) {
  const ipU32 = ipToU32(ipAddress);
  
  const tx = api.tx.ipToken.markFalsePositive(ipU32);
  
  return new Promise((resolve, reject) => {
    tx.signAndSend(keypair, ({ status }) => {
      if (status.isInBlock) {
        console.log(`✓ Marked ${ipAddress} as false positive`);
        resolve(status.asInBlock);
      }
    }).catch(reject);
  });
}

// Usage
await markFalsePositive(api, alice, "192.168.1.1");
```

**Python Example:**

```python
def mark_false_positive(substrate, keypair, ip_address_str):
    """Mark IP flagging as false positive"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    call = substrate.compose_call(
        call_module='IpToken',
        call_function='mark_false_positive',
        call_params={'ip_address': ip_u32}
    )
    
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    
    print(f"✓ Marked {ip_address_str} as false positive")
    return receipt

# Usage
mark_false_positive(substrate, alice, "192.168.1.1")
```

---

## Queries (Read Operations)

### 1. Get IP Token Data

Retrieve complete IP token information.

**Storage:** `ipToken.ipTokens(ip_address)`

**Returns:** `Option<IpTokenData>`

**JavaScript Example:**

```javascript
async function getIpToken(api, ipAddress) {
  const ipU32 = ipToU32(ipAddress);
  const token = await api.query.ipToken.ipTokens(ipU32);
  
  if (token.isSome) {
    const data = token.unwrap();
    return {
      ipAddress: u32ToIp(data.ip_address.toNumber()),
      tokenId: data.token_id.toString(),
      firstSeen: data.first_seen.toNumber(),
      threatLevel: data.threat_level.toString(),
      isMalicious: data.is_malicious.toHuman(),
      confidenceScore: data.confidence_score.toNumber(),
      attackTypes: data.attack_types.map(t => t.toString()),
      lastUpdated: data.last_updated.toNumber(),
      flaggedCount: data.flagged_count.toNumber(),
      falsePositiveCount: data.false_positive_count.toNumber(),
      history: data.history.map(h => ({
        blockNumber: h.block_number.toNumber(),
        oldStatus: h.old_status.toString(),
        newStatus: h.new_status.toString(),
        confidence: h.confidence.toNumber()
      }))
    };
  }
  
  return null;
}

// Usage
const token = await getIpToken(api, "192.168.1.1");
if (token) {
  console.log(`IP: ${token.ipAddress}`);
  console.log(`Threat Level: ${token.threatLevel}`);
  console.log(`Confidence: ${token.confidenceScore}%`);
  console.log(`Malicious: ${token.isMalicious}`);
  console.log(`Attack Types: ${token.attackTypes.join(', ')}`);
  console.log(`Flagged: ${token.flaggedCount} times`);
  console.log(`False Positives: ${token.falsePositiveCount}`);
  console.log(`History (${token.history.length} entries)`);
} else {
  console.log('Token not found');
}
```

**Python Example:**

```python
def get_ip_token(substrate, ip_address_str):
    """Get complete IP token data"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    result = substrate.query(
        module='IpToken',
        storage_function='IpTokens',
        params=[ip_u32]
    )
    
    if result.value:
        token = result.value
        return {
            'ip_address': u32_to_ip(token['ip_address']),
            'token_id': token['token_id'],
            'first_seen': token['first_seen'],
            'threat_level': token['threat_level'],
            'is_malicious': token['is_malicious'],
            'confidence_score': token['confidence_score'],
            'attack_types': token['attack_types'],
            'last_updated': token['last_updated'],
            'flagged_count': token['flagged_count'],
            'false_positive_count': token['false_positive_count'],
            'history': token['history']
        }
    
    return None

# Usage
token = get_ip_token(substrate, "192.168.1.1")
if token:
    print(f"IP: {token['ip_address']}")
    print(f"Threat Level: {token['threat_level']}")
    print(f"Confidence: {token['confidence_score']}%")
    print(f"Malicious: {token['is_malicious']}")
    print(f"Attack Types: {', '.join(token['attack_types'])}")
    print(f"Flagged: {token['flagged_count']} times")
else:
    print("Token not found")
```

---

### 2. Check Whitelist Status

**Storage:** `ipToken.whitelistedIps(ip_address)`

**Returns:** `bool`

**JavaScript Example:**

```javascript
async function isWhitelisted(api, ipAddress) {
  const ipU32 = ipToU32(ipAddress);
  const whitelisted = await api.query.ipToken.whitelistedIps(ipU32);
  return whitelisted.toHuman();
}

// Usage
const whitelisted = await isWhitelisted(api, "8.8.8.8");
console.log(`8.8.8.8 whitelisted: ${whitelisted}`);
```

**Python Example:**

```python
def is_whitelisted(substrate, ip_address_str):
    """Check if IP is whitelisted"""
    ip_u32 = ip_to_u32(ip_address_str)
    
    result = substrate.query(
        module='IpToken',
        storage_function='WhitelistedIps',
        params=[ip_u32]
    )
    
    return result.value

# Usage
whitelisted = is_whitelisted(substrate, "8.8.8.8")
print(f"8.8.8.8 whitelisted: {whitelisted}")
```

---

### 3. Get Statistics

**Storage Queries:**
- `ipToken.totalTokens()` - Total IP tokens minted
- `ipToken.maliciousCount()` - Current malicious IP count
- `ipToken.nextTokenId()` - Next token ID

**JavaScript Example:**

```javascript
async function getStats(api) {
  const [totalTokens, maliciousCount, nextId] = await Promise.all([
    api.query.ipToken.totalTokens(),
    api.query.ipToken.maliciousCount(),
    api.query.ipToken.nextTokenId()
  ]);
  
  return {
    totalTokens: totalTokens.toNumber(),
    maliciousCount: maliciousCount.toNumber(),
    nextTokenId: nextId.toString(),
    cleanCount: totalTokens.toNumber() - maliciousCount.toNumber()
  };
}

// Usage
const stats = await getStats(api);
console.log(`Total IPs: ${stats.totalTokens}`);
console.log(`Malicious: ${stats.maliciousCount}`);
console.log(`Clean: ${stats.cleanCount}`);
console.log(`Next Token ID: ${stats.nextTokenId}`);
```

**Python Example:**

```python
def get_stats(substrate):
    """Get blockchain statistics"""
    total_tokens = substrate.query('IpToken', 'TotalTokens').value
    malicious_count = substrate.query('IpToken', 'MaliciousCount').value
    next_id = substrate.query('IpToken', 'NextTokenId').value
    
    return {
        'total_tokens': total_tokens,
        'malicious_count': malicious_count,
        'next_token_id': next_id,
        'clean_count': total_tokens - malicious_count
    }

# Usage
stats = get_stats(substrate)
print(f"Total IPs: {stats['total_tokens']}")
print(f"Malicious: {stats['malicious_count']}")
print(f"Clean: {stats['clean_count']}")
```

---

## Events

### Event Subscription

**JavaScript Example:**

```javascript
async function subscribeToEvents(api) {
  // Subscribe to all events
  api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;
      
      if (event.section === 'ipToken') {
        console.log(`\n📡 Event: ${event.section}.${event.method}`);
        console.log(`   Data: ${JSON.stringify(event.data.toHuman(), null, 2)}`);
        
        // Handle specific events
        switch (event.method) {
          case 'TokenMinted':
            const [ip, tokenId, blockNumber] = event.data;
            console.log(`   🆕 New IP: ${u32ToIp(ip.toNumber())}`);
            break;
            
          case 'ThreatDetected':
            const [threatIp, level, attackType] = event.data;
            console.log(`   ⚠️  THREAT: ${u32ToIp(threatIp.toNumber())} - ${level}`);
            break;
            
          case 'BulkUpdateCompleted':
            const [count, block] = event.data;
            console.log(`   📊 Bulk: ${count} IPs processed`);
            break;
        }
      }
    });
  });
  
  console.log('🔍 Monitoring events...');
}

// Usage
await subscribeToEvents(api);
```

**Python Example:**

```python
def subscribe_to_events(substrate):
    """Subscribe to blockchain events"""
    
    def event_handler(obj, update_nr, subscription_id):
        block_num = obj['header']['number']
        print(f"\n📦 Block #{block_num}")
        
        for event in obj.get('events', []):
            if event['module_id'] == 'IpToken':
                event_id = event['event_id']
                attrs = event.get('attributes', {})
                
                print(f"📡 Event: IpToken.{event_id}")
                
                if event_id == 'TokenMinted':
                    ip = u32_to_ip(attrs.get('ip_address', 0))
                    token_id = attrs.get('token_id', 0)
                    print(f"   🆕 New IP: {ip} (Token #{token_id})")
                
                elif event_id == 'ThreatDetected':
                    ip = u32_to_ip(attrs.get('ip_address', 0))
                    level = attrs.get('threat_level', 'Unknown')
                    attack = attrs.get('attack_type', 'None')
                    print(f"   ⚠️  THREAT: {ip} - {level} ({attack})")
                
                elif event_id == 'BulkUpdateCompleted':
                    count = attrs.get('count', 0)
                    print(f"   📊 Bulk: {count} IPs processed")
    
    print("🔍 Monitoring events...")
    substrate.subscribe_block_headers(event_handler)

# Usage
subscribe_to_events(substrate)
```

### Available Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `TokenMinted` | `ip_address`, `token_id`, `block_number` | New IP token created |
| `ThreatDetected` | `ip_address`, `threat_level`, `attack_type` | Threat identified |
| `StatusUpdated` | `ip_address`, `old_status`, `new_status`, `confidence` | Status changed |
| `BulkUpdateCompleted` | `count`, `block_number` | Bulk operation finished |
| `IpRehabilitated` | `ip_address` | IP marked as rehabilitated |
| `IpWhitelisted` | `ip_address` | IP added to whitelist |
| `IpRemovedFromWhitelist` | `ip_address` | IP removed from whitelist |
| `AttackTypeAdded` | `ip_address`, `attack_type` | New attack type detected |

---

## Data Structures

### IpTokenData

```rust
{
  // Immutable fields
  ip_address: u32,
  first_seen: BlockNumber,
  token_id: u64,
  
  // Mutable fields
  threat_level: ThreatLevel,
  is_malicious: bool,
  confidence_score: u8,
  attack_types: BoundedVec<AttackType, 10>,
  last_updated: BlockNumber,
  flagged_count: u32,
  false_positive_count: u32,
  history: BoundedVec<HistoryEntry, 10>
}
```

### ThreatLevel Enum

```rust
enum ThreatLevel {
  Unknown,
  Clean,
  Suspicious,
  Malicious,
  Rehabilitated
}
```

### AttackType Enum

```rust
enum AttackType {
  SynFlood,
  UdpFlood,
  HttpFlood,
  Botnet,
  PortScan,
  DnsAmplification,
  SlowLoris,
  IcmpFlood,
  Smurf,
  Other
}
```

### HistoryEntry

```rust
{
  block_number: BlockNumber,
  old_status: ThreatLevel,
  new_status: ThreatLevel,
  confidence: u8
}
```

---

## Error Handling

### Common Errors

| Error | Code | Description | Solution |
|-------|------|-------------|----------|
| `TokenAlreadyExists` | - | IP already minted | Check existence before minting |
| `TokenNotFound` | - | IP not minted yet | Mint first or use auto-mint via update |
| `InvalidConfidence` | - | Confidence > 100 | Use 0-100 range |
| `IpWhitelisted` | - | IP is whitelisted | Cannot update whitelisted IPs |
| `AttackTypesExceeded` | - | Max 10 attack types | Remove old attack types first |
| `BulkUpdateTooLarge` | - | > 10,000 IPs in bulk | Split into multiple batches |

### JavaScript Error Handling

```javascript
try {
  await updateThreatStatus(api, alice, "192.168.1.1", 'Malicious', 95, 'SynFlood');
} catch (error) {
  if (error.toString().includes('IpWhitelisted')) {
    console.error('Cannot update whitelisted IP');
  } else if (error.toString().includes('InvalidConfidence')) {
    console.error('Confidence must be 0-100');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

### Python Error Handling

```python
try:
    update_threat_status(substrate, alice, "192.168.1.1", "Malicious", 95, "SynFlood")
except Exception as e:
    if 'IpWhitelisted' in str(e):
        print("Cannot update whitelisted IP")
    elif 'InvalidConfidence' in str(e):
        print("Confidence must be 0-100")
    else:
        print(f"Transaction failed: {e}")
```

---

## Code Examples

### Complete AI Integration Example (Python)

```python
from substrateinterface import SubstrateInterface, Keypair
import time

class BlocSaviourAI:
    def __init__(self, node_url="ws://127.0.0.1:9944", keypair_uri='//Alice'):
        self.substrate = SubstrateInterface(
            url=node_url,
            ss58_format=42,
            type_registry_preset='substrate-node-template'
        )
        self.keypair = Keypair.create_from_uri(keypair_uri)
        print(f"✓ Connected to {self.substrate.chain}")
        print(f"  Account: {self.keypair.ss58_address}")
    
    def ip_to_u32(self, ip_string):
        parts = ip_string.split('.')
        return (int(parts[0]) << 24) + (int(parts[1]) << 16) + \
               (int(parts[2]) << 8) + int(parts[3])
    
    def u32_to_ip(self, num):
        return f"{(num >> 24) & 0xFF}.{(num >> 16) & 0xFF}." \
               f"{(num >> 8) & 0xFF}.{num & 0xFF}"
    
    def flag_threat(self, ip, confidence, attack_type='Botnet'):
        """Flag single IP as threat"""
        ip_u32 = self.ip_to_u32(ip)
        
        call = self.substrate.compose_call(
            call_module='IpToken',
            call_function='update_threat_status',
            call_params={
                'ip_address': ip_u32,
                'threat_level': 'Malicious',
                'confidence': confidence,
                'attack_type': attack_type
            }
        )
        
        extrinsic = self.substrate.create_signed_extrinsic(
            call=call,
            keypair=self.keypair
        )
        
        receipt = self.substrate.submit_extrinsic(
            extrinsic,
            wait_for_inclusion=True
        )
        
        print(f"✓ Flagged {ip} - Block #{receipt.block_number}")
        return receipt
    
    def flag_botnet(self, ip_list, confidence=90):
        """Bulk flag botnet IPs"""
        updates = [
            {
                'ip_address': self.ip_to_u32(ip),
                'threat_level': 'Malicious',
                'confidence': confidence,
                'attack_type': 'Botnet'
            }
            for ip in ip_list
        ]
        
        call = self.substrate.compose_call(
            call_module='IpToken',
            call_function='bulk_update_threats',
            call_params={'updates': updates}
        )
        
        extrinsic = self.substrate.create_signed_extrinsic(
            call=call,
            keypair=self.keypair
        )
        
        receipt = self.substrate.submit_extrinsic(
            extrinsic,
            wait_for_inclusion=True
        )
        
        print(f"✓ Bulk flagged {len(ip_list)} IPs - Block #{receipt.block_number}")
        return receipt
    
    def get_reputation(self, ip):
        """Get IP reputation"""
        ip_u32 = self.ip_to_u32(ip)
        result = self.substrate.query(
            module='IpToken',
            storage_function='IpTokens',
            params=[ip_u32]
        )
        
        if result.value:
            token = result.value
            return {
                'ip': ip,
                'threat_level': token['threat_level'],
                'confidence': token['confidence_score'],
                'is_malicious': token['is_malicious'],
                'attack_types': token['attack_types'],
                'flagged_count': token['flagged_count']
            }
        return None
    
    def monitor_threats(self, callback):
        """Monitor blockchain for threats"""
        def event_handler(obj, update_nr, subscription_id):
            for event in obj.get('events', []):
                if event['module_id'] == 'IpToken':
                    if event['event_id'] == 'ThreatDetected':
                        attrs = event.get('attributes', {})
                        ip = self.u32_to_ip(attrs.get('ip_address', 0))
                        threat_data = {
                            'ip': ip,
                            'threat_level': attrs.get('threat_level'),
                            'attack_type': attrs.get('attack_type'),
                            'block': obj['header']['number']
                        }
                        callback(threat_data)
        
        print("🔍 Monitoring threats...")
        self.substrate.subscribe_block_headers(event_handler)

# Usage example
if __name__ == "__main__":
    ai = BlocSaviourAI()
    
    # Flag single threat
    ai.flag_threat("10.0.0.1", confidence=95, attack_type="SynFlood")
    
    # Flag botnet
    botnet = ["10.0.1.1", "10.0.1.2", "10.0.1.3"]
    ai.flag_botnet(botnet)
    
    # Check reputation
    rep = ai.get_reputation("10.0.0.1")
    if rep:
        print(f"\nReputation for {rep['ip']}:")
        print(f"  Threat: {rep['threat_level']}")
        print(f"  Confidence: {rep['confidence']}%")
        print(f"  Attacks: {rep['attack_types']}")
    
    # Monitor for new threats
    def on_threat(threat):
        print(f"\n🚨 ALERT: {threat['ip']} - {threat['threat_level']}")
    
    ai.monitor_threats(on_threat)
```

---

## Performance & Limits

### System Limits

| Parameter | Limit | Description |
|-----------|-------|-------------|
| **Block Time** | 6 seconds | Time between blocks |
| **Max Bulk Update** | 10,000 IPs | Per transaction |
| **Max Attack Types** | 10 per IP | Storage limit |
| **Max History** | 10 entries | Per IP token |
| **Confidence Range** | 0-100 | Percentage |
| **Target TPS** | 1,000+ | Transactions per second |

### Performance Tips

1. **Use Bulk Updates** - Batch operations are ~100x more efficient
2. **Query Caching** - Cache frequently accessed data
3. **Event Monitoring** - Use subscriptions instead of polling
4. **Parallel Queries** - Query multiple IPs concurrently
5. **Connection Pooling** - Reuse WebSocket connections

---

## Best Practices

### 1. Error Handling

```javascript
// Always wrap transactions in try-catch
try {
  await updateThreatStatus(api, alice, ip, 'Malicious', 95, 'SynFlood');
} catch (error) {
  console.error('Transaction failed:', error);
  // Implement retry logic or fallback
}
```

### 2. Batch Operations

```javascript
// Instead of 1000 individual calls:
// for (let ip of ips) await update(ip); // ❌ SLOW

// Use bulk update:
await bulkUpdateThreats(api, alice, ips, 'Malicious', 90, 'Botnet'); // ✅ FAST
```

### 3. Connection Management

```javascript
// Create connection once
const api = await connectToBlockchain();

// Reuse for multiple operations
await operation1(api);
await operation2(api);
await operation3(api);

// Close when done
await api.disconnect();
```

### 4. Event Monitoring

```javascript
// Don't poll - subscribe to events
api.query.system.events((events) => {
  // Process events in real-time
});
```

### 5. Confidence Scoring

```javascript
// Use appropriate confidence levels
const confidence = {
  CERTAIN: 95,      // Strong evidence
  HIGH: 85,         // Multiple indicators
  MEDIUM: 70,       // Some indicators
  LOW: 50,          // Suspicious
  UNKNOWN: 0        // No data
};
```

---

## Additional Resources

- **Polkadot.js API Docs**: https://polkadot.js.org/docs/api
- **Substrate Interface (Python)**: https://github.com/polkascan/py-substrate-interface
- **Substrate Docs**: https://docs.substrate.io/
- **GitHub Repository**: https://github.com/your-repo/bloc-saviour

---

## Support

For issues or questions:
1. Check the error handling section
2. Review code examples
3. Consult Substrate documentation
4. Open GitHub issue

---

**Last Updated:** December 2024  
**API Version:** 1.0  
**Substrate Version:** stable2409
