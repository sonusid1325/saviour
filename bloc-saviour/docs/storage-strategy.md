# Storage Strategy: IP Token Management

## Overview

The Bloc-Saviour blockchain uses a **lazy minting** approach to track IP addresses. This document explains what gets stored, why, and how to optimize storage if needed.

---

## What Gets Stored?

### The blockchain stores **EVERY IP** that is encountered, not just malicious ones.

When an IP address is first seen (either through explicit minting or when updating its threat status), a token is created on-chain with:

**Immutable Fields:**
- `ip_address` (u32) - IPv4 address stored as integer
- `first_seen` (BlockNumber) - when token was minted
- `token_id` (unique identifier)

**Mutable Fields:**
- `threat_level` (enum): Unknown, Clean, Suspicious, Malicious, Rehabilitated
- `is_malicious` (bool) - quick flag for filtering
- `confidence_score` (u8) - 0-100, confidence in the classification
- `attack_types` (Vec<AttackType>) - list of attack types detected
- `last_updated` (BlockNumber) - last time status changed
- `flagged_count` (u32) - number of times this IP was flagged
- `false_positive_count` (u32) - times it was unflagged

**History Tracking:**
- Last 10 status changes with timestamps
- Each history entry: (BlockNumber, old_status, new_status, reason)

---

## Storage Behavior

### Lazy Minting

```rust
// When you call update_threat_status on a NEW IP:
let mut token = if let Some(existing_token) = IpTokens::<T>::get(ip_address) {
    existing_token
} else {
    // Auto-mint if doesn't exist - THIS STORES THE IP
    Self::mint_ip_token(origin.clone(), ip_address)?;
    IpTokens::<T>::get(ip_address).ok_or(Error::<T>::TokenNotFound)?
};
```

### Initial State

New IPs start with:
- `threat_level`: `ThreatLevel::Unknown`
- `confidence_score`: 0
- `is_malicious`: false
- `attack_types`: empty
- `flagged_count`: 0

---

## Why Store All IPs?

This design choice is intentional for several important reasons:

### 1. **Baseline Tracking**
You need to track clean IPs to establish normal behavior patterns. Machine learning models require both positive and negative examples to function effectively.

### 2. **Historical Context**
If an IP later becomes malicious, you have the complete history from when it was first seen. This helps in:
- Identifying compromised legitimate servers
- Tracking the evolution of threats
- Understanding attack patterns over time

### 3. **False Positive Detection**
You can track IPs that were wrongly flagged via `false_positive_count`. This helps:
- Improve AI model accuracy
- Reduce legitimate traffic blocking
- Build trust scores for IPs

### 4. **Rehabilitation**
Clean IPs that were once malicious can be tracked through their recovery period. The `Rehabilitated` status shows IPs that have returned to normal behavior.

### 5. **Audit Trail**
Complete forensic history of all network activity for:
- Compliance requirements
- Security investigations
- Performance analysis
- Legal evidence

---

## Storage Statistics

### Counters

The blockchain maintains these global counters:

```rust
/// Total count of minted tokens (ALL IPs)
#[pallet::storage]
pub type TotalTokens<T: Config> = StorageValue<_, u64, ValueQuery>;

/// Count of ONLY currently malicious IPs
#[pallet::storage]
pub type MaliciousCount<T: Config> = StorageValue<_, u32, ValueQuery>;
```

**What they mean:**
- `TotalTokens` = All IPs ever seen (clean + suspicious + malicious + unknown)
- `MaliciousCount` = Only IPs currently flagged as malicious

---

## Example IP Lifecycle

```
Network activity over time:

Block 100:  IP 192.168.1.1 → First seen → Minted with ThreatLevel::Unknown
Block 200:  IP 192.168.1.1 → AI detects normal traffic → Updated to ThreatLevel::Clean
Block 500:  IP 192.168.1.1 → AI detects SYN flood → Updated to ThreatLevel::Malicious
Block 800:  IP 192.168.1.1 → Activity stops, 30 days pass → Updated to ThreatLevel::Rehabilitated

Throughout this entire lifecycle, the IP token is STORED on chain.
All transitions are recorded in the history buffer.
```

---

## Storage Footprint

### Current Design (~216 bytes per IP)

**Breakdown:**
- IP address: 4 bytes
- Token ID: 8 bytes
- Timestamps: 16 bytes (first_seen, last_updated)
- Threat level: 1 byte
- Confidence: 1 byte
- Flags: 1 byte
- Counters: 8 bytes (flagged_count, false_positive_count)
- Attack types: ~20 bytes (variable)
- History buffer (10 entries): ~150 bytes
- Overhead: ~7 bytes

**Capacity Planning:**

| IPs Tracked | Storage Required |
|------------|------------------|
| 1 million  | ~216 MB          |
| 10 million | ~2.16 GB         |
| 100 million| ~21.6 GB         |
| 1 billion  | ~216 GB          |

---

## Storage Optimization Strategies

If storage becomes a concern, consider these approaches:

### 1. **Storage Pruning** (Recommended)

Delete tokens for IPs that meet ALL these criteria:
- Haven't been seen in X days (e.g., 90 days)
- Were never malicious
- Have flagged_count = 0

```rust
// Example pruning extrinsic (to be implemented)
pub fn prune_old_clean_ips(
    origin: OriginFor<T>,
    age_threshold: BlockNumber,
) -> DispatchResult {
    // Only admin can prune
    T::AdminOrigin::ensure_origin(origin)?;
    
    let current_block = <frame_system::Pallet<T>>::block_number();
    let mut pruned_count = 0;
    
    for (ip, token) in IpTokens::<T>::iter() {
        let age = current_block.saturating_sub(token.last_updated);
        
        if age > age_threshold &&
           !token.is_malicious &&
           token.flagged_count == 0 &&
           matches!(token.threat_level, ThreatLevel::Clean | ThreatLevel::Unknown) {
            IpTokens::<T>::remove(ip);
            pruned_count += 1;
        }
    }
    
    Self::deposit_event(Event::TokensPruned(pruned_count));
    Ok(())
}
```

### 2. **Tiered Storage**

Keep only malicious/suspicious IPs on-chain, move clean IPs to off-chain storage:
- On-chain: Malicious, Suspicious, Recently active
- Off-chain DB: Clean, Old, Never flagged

### 3. **Threshold-Based Minting**

Only mint tokens for IPs that meet certain criteria:
- Traffic volume above threshold
- Geographic location of interest
- First seen from suspicious port
- Specific network ranges only

### 4. **History Compression**

Reduce history buffer from 10 to 5 entries for clean IPs:
```rust
const MAX_HISTORY_ENTRIES_MALICIOUS: usize = 10;
const MAX_HISTORY_ENTRIES_CLEAN: usize = 5;
```

### 5. **Aggregation**

For large-scale networks, consider:
- Storing /24 subnets instead of individual IPs
- Aggregating statistics for IP ranges
- Using bloom filters for quick checks

---

## Modifying Storage Behavior

### Option: Store ONLY Malicious IPs

If you want to only store malicious IPs (NOT recommended), modify `update_threat_status`:

```rust
pub fn update_threat_status(
    origin: OriginFor<T>,
    ip_address: u32,
    threat_level: ThreatLevel,
    confidence: u8,
    attack_type: Option<AttackType>,
) -> DispatchResult {
    let _who = ensure_signed(origin)?;
    
    ensure!(confidence <= 100, Error::<T>::InvalidConfidence);
    ensure!(!WhitelistedIps::<T>::get(ip_address), Error::<T>::IpWhitelisted);

    // ONLY store if malicious
    if !matches!(threat_level, ThreatLevel::Malicious | ThreatLevel::Suspicious) {
        return Ok(()); // Ignore non-malicious IPs
    }
    
    // Rest of the logic...
}
```

**⚠️ Warning:** This approach loses:
- Pattern analysis capabilities
- ML training data (need both positive and negative examples)
- Forensic investigation history
- Compliance audit trails
- False positive tracking
- Rehabilitation tracking

---

## Recommendation for DDoS Prevention

**Keep the current design (store all IPs)** because:

✅ **Baseline Behavior**: You need clean IP patterns to detect anomalies  
✅ **ML Training Data**: Both malicious and clean samples are required  
✅ **False Positive Tracking**: Prevent blocking legitimate traffic  
✅ **Audit Compliance**: Complete history for investigations  
✅ **Manageable Cost**: 2GB for 10M IPs is reasonable  

**If storage becomes an issue:**
- Implement **automatic pruning** of old, clean IPs
- Use **tiered storage** for archival data
- Consider **off-chain indexing** for analytics

---

## Querying Storage

### Get IP Reputation

```rust
// Via RPC
get_ip_reputation("192.168.1.1") -> TokenData {
    ip_address: 3232235777,
    token_id: 12345,
    threat_level: Malicious,
    confidence_score: 95,
    is_malicious: true,
    attack_types: [SYN_FLOOD, HTTP_FLOOD],
    first_seen: 1000,
    last_updated: 5000,
    flagged_count: 3,
    false_positive_count: 0,
    history: [...]
}
```

### Get Statistics

```rust
// Total IPs tracked
TotalTokens::get() -> 10000000

// Currently malicious IPs
MaliciousCount::get() -> 15420

// Query malicious IPs
query_malicious_ips(limit: 100) -> Vec<IpAddress>
```

---

## Performance Considerations

### Read Performance
- **Indexed by IP address**: O(1) lookup
- **Storage map**: Direct access, no iteration needed
- **Response time**: Sub-millisecond for single IP queries

### Write Performance
- **Minting**: ~10ms per IP (lazy, on-demand)
- **Bulk updates**: 10k IPs in ~5-10 seconds
- **Target TPS**: 1,000 transactions per second

### Storage Growth Rate

For a typical enterprise network:
- **Normal traffic**: ~1,000 new IPs/day → 216 KB/day
- **Attack scenario**: ~100,000 new IPs/day → 21.6 MB/day
- **Annual growth**: ~7-80 GB/year

---

## Migration Strategy

If you need to change storage behavior after launch:

1. **Create new storage version**
2. **Migrate existing data** using runtime upgrade
3. **Deprecate old storage** gradually
4. **Export to off-chain** for archival

Example migration:
```rust
pub fn migrate_to_v2<T: Config>() {
    // Read old storage
    for (ip, old_token) in OldIpTokens::<T>::drain() {
        // Transform data
        let new_token = transform(old_token);
        // Write to new storage
        IpTokensV2::<T>::insert(ip, new_token);
    }
}
```

---

## Monitoring Storage Health

### Metrics to Track

1. **Total IPs stored**: `TotalTokens::get()`
2. **Growth rate**: New IPs per block/day
3. **Malicious ratio**: `MaliciousCount / TotalTokens`
4. **Storage size**: On-disk database size
5. **Pruning efficiency**: IPs removed per pruning run

### Alerts

Set up alerts for:
- Storage growth > 100 GB/month
- Malicious ratio > 10%
- Database size > 500 GB
- Failed pruning operations

---

## Conclusion

The **store-all-IPs** approach is the recommended strategy for Bloc-Saviour because:

1. ✅ Provides complete threat intelligence
2. ✅ Enables accurate ML model training
3. ✅ Supports forensic investigations
4. ✅ Maintains compliance audit trails
5. ✅ Allows false positive tracking
6. ✅ Storage cost is manageable with pruning

**Only switch to malicious-only storage if:**
- Disk space is severely constrained
- You have alternative off-chain storage
- You don't need ML-based detection
- Compliance doesn't require full history

For most DDoS prevention use cases, storing all IPs provides the best security posture and operational flexibility.
