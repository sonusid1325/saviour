# Bloc-Saviour Blockchain - Complete File Structure and Developer Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Core Components](#core-components)
4. [Detailed File Descriptions](#detailed-file-descriptions)
5. [How to Edit Pallets](#how-to-edit-pallets)
6. [Configuration Guide](#configuration-guide)
7. [Adding New Features](#adding-new-features)
8. [Testing Guide](#testing-guide)
9. [Deployment Guide](#deployment-guide)

---

## Project Overview

**Bloc-Saviour** is a Substrate-based blockchain for DDoS prevention and IP reputation management. It uses NFT-like IP tokens to track and manage threat intelligence across network infrastructure.

### Key Features
- **IP Token Management**: Each IP address is a unique token with threat status
- **Lazy Minting**: Tokens are created only when an IP is first encountered
- **Bulk Operations**: Efficient batch updates for botnet detection (up to 10,000 IPs)
- **Access Control**: Only authorized AI nodes can update threat status
- **Complete History**: Tracks all status changes for forensic analysis
- **Whitelist Management**: Permanent whitelist for known-good IPs

---

## File Structure

```
bloc-saviour/
├── Cargo.toml                          # Workspace configuration
├── README.md                           # Project overview
├── FIXES_APPLIED.md                    # Build fixes documentation
├── docs/
│   ├── storage-strategy.md             # Storage design documentation
│   └── rust-setup.md                   # Rust installation guide
│
├── node/                               # Blockchain node implementation
│   ├── Cargo.toml                      # Node dependencies
│   ├── build.rs                        # Build script
│   └── src/
│       ├── main.rs                     # Node entry point
│       ├── chain_spec.rs               # Chain specification
│       ├── cli.rs                      # CLI interface
│       ├── command.rs                  # Command handlers
│       ├── rpc.rs                      # RPC endpoints
│       └── service.rs                  # Node service configuration
│
├── runtime/                            # Blockchain runtime
│   ├── Cargo.toml                      # Runtime dependencies
│   ├── build.rs                        # WASM build script
│   └── src/
│       ├── lib.rs                      # Runtime assembly
│       ├── apis.rs                     # Runtime APIs
│       ├── configs/
│       │   └── mod.rs                  # Pallet configurations
│       └── benchmarks.rs               # Runtime benchmarks
│
└── pallets/                            # Custom pallets
    ├── ip-token/                       # IP Token pallet (MAIN)
    │   ├── Cargo.toml                  # Pallet dependencies
    │   └── src/
    │       ├── lib.rs                  # Core pallet logic
    │       ├── mock.rs                 # Test mock runtime
    │       ├── tests.rs                # Unit tests
    │       ├── weights.rs              # Weight calculations
    │       └── benchmarking.rs         # Performance benchmarks
    │
    ├── access-control/                 # Access Control pallet
    │   ├── Cargo.toml                  # Pallet dependencies
    │   └── src/
    │       └── lib.rs                  # Authorization logic
    │
    └── template/                       # Reference template
        ├── Cargo.toml
        └── src/
            └── lib.rs
```

---

## Core Components

### 1. **Node** (`node/`)
**Role**: Executable blockchain node that runs the network

**Key Files:**
- `main.rs`: Entry point, initializes the node
- `service.rs`: Configures consensus (Aura + GRANDPA), networking, RPC
- `chain_spec.rs`: Defines genesis configuration
- `rpc.rs`: Exposes RPC endpoints for external queries

**What it does:**
- Runs the blockchain network
- Manages peer-to-peer connections
- Produces and validates blocks
- Provides RPC interface for clients

---

### 2. **Runtime** (`runtime/`)
**Role**: The blockchain's state transition function (STF)

**Key Files:**
- `lib.rs`: Assembles all pallets into a single runtime
- `configs/mod.rs`: Configures each pallet's parameters
- `apis.rs`: Defines runtime APIs for external access

**What it does:**
- Defines the blockchain's logic
- Compiles to WebAssembly (WASM)
- Executes transactions
- Manages state transitions
- Can be upgraded without hard forks

---

### 3. **Pallets** (`pallets/`)
**Role**: Modular components containing specific business logic

#### **IP Token Pallet** (`pallets/ip-token/`)
**Role**: Core DDoS prevention logic

**Files:**
- `lib.rs`: Main pallet implementation
- `mock.rs`: Test environment setup
- `tests.rs`: Comprehensive unit tests
- `weights.rs`: Transaction cost calculations
- `benchmarking.rs`: Performance testing

**What it does:**
- Mints IP tokens (lazy minting)
- Updates threat status
- Tracks attack history
- Manages whitelist
- Handles bulk operations

#### **Access Control Pallet** (`pallets/access-control/`)
**Role**: Authorization and permission management

**Files:**
- `lib.rs`: Complete implementation

**What it does:**
- Manages authorized AI nodes
- Controls admin permissions
- Verifies update permissions

---

## Detailed File Descriptions

### 🔧 Workspace Configuration

#### `Cargo.toml` (Root)
```toml
[workspace]
members = [
    "node",
    "pallets/ip-token",
    "pallets/access-control",
    "pallets/template",
    "runtime",
]
```

**Purpose**: Defines the workspace structure and shared dependencies

**Dependencies defined:**
- Polkadot SDK primitives (sp-*)
- FRAME pallets (pallet-*)
- Client libraries (sc-*)
- Codec and serialization
- External crates (clap, futures, etc.)

**When to edit:**
- Adding new pallets to the workspace
- Updating dependency versions
- Adding new shared dependencies

---

### 📦 IP Token Pallet Files

#### `pallets/ip-token/Cargo.toml`

**Purpose**: Defines pallet dependencies

**Key dependencies:**
```toml
codec = { features = ["derive"], workspace = true }
scale-info = { features = ["derive"], workspace = true }
frame-support.workspace = true
frame-system.workspace = true
```

**When to edit:**
- Adding new functionality requiring external crates
- Enabling optional features

---

#### `pallets/ip-token/src/lib.rs` (MAIN FILE - 600+ lines)

**Structure:**
```rust
#[frame_support::pallet]
pub mod pallet {
    // 1. Type Definitions
    // 2. Pallet Configuration
    // 3. Storage Definitions
    // 4. Events
    // 5. Errors
    // 6. Extrinsics (Functions)
    // 7. Helper Functions
}
```

**Key Sections:**

##### **1. Type Definitions (Lines 45-105)**
```rust
pub enum ThreatLevel {
    Unknown,
    Clean,
    Suspicious,
    Malicious,
    Rehabilitated,
}

pub enum AttackType {
    SynFlood,
    UdpFlood,
    HttpFlood,
    Botnet,
    DnsAmplification,
    // ... more
}

pub struct IpTokenData<BlockNumber> {
    // Immutable
    pub ip_address: u32,
    pub first_seen: BlockNumber,
    pub token_id: u64,
    
    // Mutable
    pub threat_level: ThreatLevel,
    pub is_malicious: bool,
    pub confidence_score: u8,
    pub attack_types: BoundedVec<AttackType, ConstU32<10>>,
    pub last_updated: BlockNumber,
    pub flagged_count: u32,
    pub false_positive_count: u32,
    pub history: BoundedVec<HistoryEntry<BlockNumber>, ConstU32<10>>,
}
```

**How to edit:**
- Add new threat levels: Add variant to `ThreatLevel` enum
- Add new attack types: Add variant to `AttackType` enum
- Change storage limits: Modify `MAX_ATTACK_TYPES` or `MAX_HISTORY_SIZE` constants

##### **2. Pallet Configuration (Lines 117-123)**
```rust
#[pallet::config]
pub trait Config: frame_system::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<...>;
    type WeightInfo: WeightInfo;
    type MaxBulkUpdate: Get<u32>;
    type ConfidenceThreshold: Get<u8>;
}
```

**How to edit:**
- Add configuration parameters: Define new associated types
- Example: Add `type MaxHistorySize: Get<u32>;`

##### **3. Storage Definitions (Lines 136-167)**
```rust
#[pallet::storage]
pub type IpTokens<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u32,                                    // IP address
    IpTokenData<BlockNumberFor<T>>,        // Token data
    OptionQuery,
>;

#[pallet::storage]
pub type WhitelistedIps<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u32,
    bool,
    ValueQuery,
>;

#[pallet::storage]
pub type TotalTokens<T: Config> = StorageValue<_, u64, ValueQuery>;

#[pallet::storage]
pub type MaliciousCount<T: Config> = StorageValue<_, u32, ValueQuery>;

#[pallet::storage]
pub type NextTokenId<T: Config> = StorageValue<_, u64, ValueQuery>;
```

**How to edit:**
- Add new storage: Use `#[pallet::storage]` macro
- Types: `StorageValue` (single value), `StorageMap` (key-value), `StorageDoubleMap` (two keys)

**Example - Adding geolocation:**
```rust
#[pallet::storage]
pub type IpGeolocation<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u32,                    // IP address
    (u32, u32),            // (latitude, longitude)
    OptionQuery,
>;
```

##### **4. Events (Lines 183-218)**
```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    TokenMinted {
        ip_address: u32,
        token_id: u64,
        block_number: BlockNumberFor<T>,
    },
    ThreatDetected {
        ip_address: u32,
        threat_level: ThreatLevel,
        attack_type: Option<AttackType>,
    },
    // ... more events
}
```

**How to edit:**
- Add new events for important state changes
- Events are emitted with `Self::deposit_event(Event::YourEvent { ... });`

**Example:**
```rust
GeolocationUpdated {
    ip_address: u32,
    latitude: u32,
    longitude: u32,
}
```

##### **5. Errors (Lines 221-244)**
```rust
#[pallet::error]
pub enum Error<T> {
    TokenAlreadyExists,
    TokenNotFound,
    IpWhitelisted,
    InvalidConfidence,
    BulkUpdateTooLarge,
    NotMalicious,
}
```

**How to edit:**
- Add error for new failure conditions
- Use in code: `ensure!(condition, Error::<T>::YourError);`

##### **6. Extrinsics (Functions) (Lines 247-528)**

**Core extrinsics:**

###### **`mint_ip_token`** (Lines 251-281)
```rust
#[pallet::call_index(0)]
#[pallet::weight(T::WeightInfo::mint_ip_token())]
pub fn mint_ip_token(
    origin: OriginFor<T>,
    ip_address: u32,
) -> DispatchResult {
    let _who = ensure_signed(origin)?;
    
    ensure!(!IpTokens::<T>::contains_key(ip_address), Error::<T>::TokenAlreadyExists);
    
    let current_block = <frame_system::Pallet<T>>::block_number();
    let token_id = NextTokenId::<T>::get();
    
    // Create token...
    
    Ok(())
}
```

**How to edit:**
- Change signature: Modify parameters
- Add validation: Use `ensure!()` macro
- Update storage: Use storage methods (`.insert()`, `.mutate()`, etc.)

###### **`update_threat_status`** (Lines 315-415)
```rust
#[pallet::call_index(1)]
#[pallet::weight(T::WeightInfo::update_threat_status())]
pub fn update_threat_status(
    origin: OriginFor<T>,
    ip_address: u32,
    threat_level: ThreatLevel,
    confidence: u8,
    attack_type: Option<AttackType>,
) -> DispatchResult {
    // Implementation...
}
```

**Logic flow:**
1. Verify caller is signed
2. Validate confidence score (0-100)
3. Check if IP is whitelisted
4. Get or auto-mint token
5. Update threat level
6. Update attack types
7. Add history entry
8. Update counters
9. Emit events

**How to edit:**
- Add validation checks
- Modify update logic
- Add new fields to update

###### **`bulk_update_threats`** (Lines 418-462)
```rust
#[pallet::call_index(2)]
#[pallet::weight(T::WeightInfo::bulk_update_threats(updates.len() as u32))]
pub fn bulk_update_threats(
    origin: OriginFor<T>,
    updates: Vec<BulkUpdateEntry>,
) -> DispatchResult {
    let _who = ensure_signed(origin)?;
    
    ensure!(
        updates.len() <= T::MaxBulkUpdate::get() as usize,
        Error::<T>::BulkUpdateTooLarge
    );
    
    for entry in updates.iter() {
        // Process each update...
    }
    
    Ok(())
}
```

**How to edit:**
- Change batch size limit
- Add batch validation
- Optimize processing

###### **Other Extrinsics:**
- `rehabilitate_ip`: Mark IP as clean after cool-down
- `add_to_whitelist`: Add IP to permanent whitelist (root only)
- `remove_from_whitelist`: Remove from whitelist (root only)
- `mark_false_positive`: Increment false positive counter

**Adding a new extrinsic:**
```rust
#[pallet::call_index(7)]  // Next available index
#[pallet::weight(Weight::from_parts(10_000, 0))]
pub fn your_new_function(
    origin: OriginFor<T>,
    param1: u32,
    param2: ThreatLevel,
) -> DispatchResult {
    let who = ensure_signed(origin)?;
    
    // Your logic here
    
    Self::deposit_event(Event::YourEvent { ... });
    Ok(())
}
```

---

#### `pallets/ip-token/src/mock.rs`

**Purpose**: Creates a mock runtime for testing

**Structure:**
```rust
// 1. Define mock runtime types
type Block = frame_system::mocking::MockBlock<Test>;

// 2. Construct runtime
frame_support::construct_runtime!(
    pub enum Test {
        System: frame_system,
        IpToken: pallet_ip_token,
    }
);

// 3. Configure pallets
impl frame_system::Config for Test { ... }
impl pallet_ip_token::Config for Test { ... }

// 4. Helper function
pub fn new_test_ext() -> sp_io::TestExternalities { ... }
```

**How to edit:**
- Add new pallets to mock runtime
- Configure test parameters
- Add helper functions for tests

---

#### `pallets/ip-token/src/tests.rs`

**Purpose**: Comprehensive unit tests

**Test structure:**
```rust
#[test]
fn test_name() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        
        // Setup
        let ip = 0xC0A80101;  // 192.168.1.1
        
        // Execute
        assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));
        
        // Verify
        let token = IpToken::ip_tokens(ip).unwrap();
        assert_eq!(token.ip_address, ip);
        assert_eq!(token.threat_level, ThreatLevel::Unknown);
    });
}
```

**Existing tests:**
- `test_mint_ip_token`: Basic minting
- `test_update_threat_status`: Status updates
- `test_auto_mint_on_update`: Lazy minting
- `test_bulk_update`: Batch operations
- `test_whitelist`: Whitelist functionality
- `test_rehabilitate_ip`: IP rehabilitation
- `test_invalid_confidence`: Error handling
- `test_history_tracking`: History management
- `test_attack_types`: Attack type tracking
- `test_false_positive_tracking`: False positives
- `test_malicious_counter`: Counter accuracy

**How to add new tests:**
```rust
#[test]
fn test_your_feature() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        
        // Your test logic
        assert_ok!(IpToken::your_function(...));
        
        // Assertions
        assert_eq!(actual, expected);
        assert!(condition);
    });
}
```

**Helpful macros:**
- `assert_ok!(result)`: Assert successful execution
- `assert_noop!(call, error)`: Assert call fails with specific error
- `assert_eq!(a, b)`: Assert equality
- `assert!(condition)`: Assert condition is true

---

#### `pallets/ip-token/src/weights.rs`

**Purpose**: Define computational costs for each extrinsic

**Structure:**
```rust
pub trait WeightInfo {
    fn mint_ip_token() -> Weight;
    fn update_threat_status() -> Weight;
    fn bulk_update_threats(n: u32) -> Weight;
    // ... more
}

impl WeightInfo for () {
    fn mint_ip_token() -> Weight {
        Weight::from_parts(10_000_000, 0)
            .saturating_add(Weight::from_parts(0, 3000))
    }
    
    fn bulk_update_threats(n: u32) -> Weight {
        Weight::from_parts(10_000_000, 0)
            .saturating_add(Weight::from_parts(15_000_000, 0).saturating_mul(n as u64))
    }
}
```

**Components:**
- **ref_time**: Computational time (picoseconds)
- **proof_size**: Storage proof size (bytes)

**How to edit:**
- Adjust weights based on benchmarking results
- For new extrinsics, estimate initial weights
- Use benchmarking to get accurate weights

---

#### `pallets/ip-token/src/benchmarking.rs`

**Purpose**: Performance benchmarking for weight calculation

**Structure:**
```rust
#[benchmarks]
mod benchmarks {
    use super::*;
    
    #[benchmark]
    fn mint_ip_token() {
        let caller: T::AccountId = whitelisted_caller();
        let ip: u32 = 0xC0A80101;
        
        #[extrinsic_call]
        mint_ip_token(RawOrigin::Signed(caller), ip);
        
        assert!(IpTokens::<T>::contains_key(ip));
    }
}
```

**How to run benchmarks:**
```bash
cargo test --package pallet-ip-token --features runtime-benchmarks
```

---

### 🔐 Access Control Pallet Files

#### `pallets/access-control/src/lib.rs`

**Purpose**: Manage authorization for IP status updates

**Key Functions:**

##### **`authorize_node`**
```rust
pub fn authorize_node(
    origin: OriginFor<T>,
    account: T::AccountId,
) -> DispatchResult {
    // Only root or admin can authorize
    if ensure_root(origin.clone()).is_ok() {
        // Root can always authorize
    } else {
        let who = ensure_signed(origin)?;
        ensure!(Admins::<T>::get(&who), Error::<T>::NotAdmin);
    }
    
    AuthorizedNodes::<T>::insert(&account, true);
    Ok(())
}
```

##### **`add_admin`**
```rust
pub fn add_admin(
    origin: OriginFor<T>,
    account: T::AccountId,
) -> DispatchResult {
    ensure_root(origin)?;  // Only root can add admins
    
    Admins::<T>::insert(&account, true);
    Ok(())
}
```

**Storage:**
- `AuthorizedNodes`: Map of authorized AI node accounts
- `Admins`: Map of admin accounts

**How to edit:**
- Add role-based permissions
- Add time-based authorization (expires after X blocks)
- Add permission levels (read-only, update, admin)

---

### ⚙️ Runtime Files

#### `runtime/src/lib.rs`

**Purpose**: Assembles all pallets into a unified runtime

**Key sections:**

##### **1. Runtime Version (Lines 59-74)**
```rust
#[sp_version::runtime_version]
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!("bloc-saviour"),
    impl_name: create_runtime_str!("bloc-saviour"),
    authoring_version: 1,
    spec_version: 100,
    impl_version: 1,
    apis: apis::RUNTIME_API_VERSIONS,
    transaction_version: 1,
    state_version: 1,
};
```

**When to edit:**
- Increment `spec_version` when changing runtime logic (triggers upgrade)
- Update `spec_name` if forking project

##### **2. Block Time Configuration (Lines 77-89)**
```rust
mod block_times {
    pub const MILLI_SECS_PER_BLOCK: u64 = 6000;  // 6 seconds
    pub const SLOT_DURATION: u64 = MILLI_SECS_PER_BLOCK;
}
```

**How to edit:**
- Change block time: Modify `MILLI_SECS_PER_BLOCK`
- Affects finality time and throughput

##### **3. Runtime Assembly (Lines 186-233)**
```rust
#[frame_support::runtime]
mod runtime {
    #[runtime::runtime]
    pub struct Runtime;
    
    #[runtime::pallet_index(0)]
    pub type System = frame_system;
    
    #[runtime::pallet_index(1)]
    pub type Timestamp = pallet_timestamp;
    
    // ... standard pallets
    
    #[runtime::pallet_index(8)]
    pub type IpToken = pallet_ip_token;
    
    #[runtime::pallet_index(9)]
    pub type AccessControl = pallet_access_control;
}
```

**How to add a new pallet:**
1. Add dependency in `runtime/Cargo.toml`
2. Add pallet with next available index
3. Configure in `runtime/src/configs/mod.rs`

---

#### `runtime/src/configs/mod.rs`

**Purpose**: Configure all pallets

**Structure:**
```rust
// Parameter types
parameter_types! {
    pub const BlockHashCount: BlockNumber = 2400;
    pub const MaxBulkUpdate: u32 = 10_000;
    pub const ConfidenceThreshold: u8 = 75;
}

// System pallet config
impl frame_system::Config for Runtime { ... }

// Timestamp pallet config
impl pallet_timestamp::Config for Runtime { ... }

// IP Token pallet config
impl pallet_ip_token::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type WeightInfo = ();
    type MaxBulkUpdate = MaxBulkUpdate;
    type ConfidenceThreshold = ConfidenceThreshold;
}
```

**How to edit:**
- Change `MaxBulkUpdate`: Maximum IPs in one batch update
- Change `ConfidenceThreshold`: Minimum confidence for auto-flagging
- Add new configuration parameters

**Example - Adding max history size:**
```rust
parameter_types! {
    pub const MaxHistorySize: u32 = 20;  // Increase from 10
}

impl pallet_ip_token::Config for Runtime {
    // ... existing config
    type MaxHistorySize = MaxHistorySize;
}
```

---

### 🖥️ Node Files

#### `node/src/chain_spec.rs`

**Purpose**: Define genesis block and initial state

**Key sections:**

##### **Genesis Configuration**
```rust
pub fn development_config() -> Result<ChainSpec, String> {
    let wasm_binary = WASM_BINARY
        .ok_or_else(|| "Development wasm not available".to_string())?;
    
    Ok(ChainSpec::from_genesis(
        "Development",
        "dev",
        ChainType::Development,
        move || {
            testnet_genesis(
                wasm_binary,
                // Initial authorities (Aura + GRANDPA)
                vec![authority_keys_from_seed("Alice")],
                // Sudo key
                get_account_id_from_seed::<sr25519::Public>("Alice"),
                // Endowed accounts
                vec![
                    get_account_id_from_seed::<sr25519::Public>("Alice"),
                    get_account_id_from_seed::<sr25519::Public>("Bob"),
                ],
                true,
            )
        },
        vec![],
        None,
        None,
        None,
        None,
        Extensions::default(),
    ))
}
```

**How to edit:**
- Add initial balances
- Configure initial authorized nodes
- Set genesis IP whitelist

**Example - Add genesis authorized nodes:**
```rust
fn testnet_genesis(
    // ... parameters
) -> RuntimeGenesisConfig {
    RuntimeGenesisConfig {
        // ... other configs
        
        access_control: AccessControlConfig {
            initial_admins: vec![
                get_account_id_from_seed::<sr25519::Public>("Alice"),
            ],
            initial_authorized_nodes: vec![
                get_account_id_from_seed::<sr25519::Public>("AI_Node_1"),
                get_account_id_from_seed::<sr25519::Public>("AI_Node_2"),
            ],
        },
    }
}
```

---

#### `node/src/rpc.rs`

**Purpose**: Define RPC methods for external queries

**Structure:**
```rust
pub fn create_full<C, P>(
    deps: FullDeps<C, P>,
) -> Result<RpcModule<()>, Box<dyn std::error::Error + Send + Sync>>
where
    C: ProvideRuntimeApi<Block>,
    // ... trait bounds
{
    let mut module = RpcModule::new(());
    
    // Standard Substrate RPCs
    module.merge(System::new(client.clone(), pool, deny_unsafe).into_rpc())?;
    module.merge(TransactionPayment::new(client).into_rpc())?;
    
    // Add custom RPC methods here
    
    Ok(module)
}
```

**How to add custom RPC:**
1. Create RPC trait in `pallets/ip-token/rpc/`
2. Implement RPC methods
3. Register in `node/src/rpc.rs`

---

## How to Edit Pallets

### Step-by-Step Guide

#### 1. **Adding a New Storage Item**

**Example: Add IP geolocation**

**In `pallets/ip-token/src/lib.rs`:**

```rust
// Step 1: Add to storage
#[pallet::storage]
#[pallet::getter(fn ip_geolocation)]
pub type IpGeolocation<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u32,                    // IP address
    (u32, u32),            // (latitude, longitude)
    OptionQuery,
>;
```

**Step 2: Add extrinsic to update it**

```rust
#[pallet::call_index(7)]
#[pallet::weight(Weight::from_parts(10_000, 0))]
pub fn set_ip_geolocation(
    origin: OriginFor<T>,
    ip_address: u32,
    latitude: u32,
    longitude: u32,
) -> DispatchResult {
    let _who = ensure_signed(origin)?;
    
    // Validate IP exists
    ensure!(IpTokens::<T>::contains_key(ip_address), Error::<T>::TokenNotFound);
    
    // Store geolocation
    IpGeolocation::<T>::insert(ip_address, (latitude, longitude));
    
    // Emit event
    Self::deposit_event(Event::GeolocationSet {
        ip_address,
        latitude,
        longitude,
    });
    
    Ok(())
}
```

**Step 3: Add event**

```rust
#[pallet::event]
pub enum Event<T: Config> {
    // ... existing events
    
    GeolocationSet {
        ip_address: u32,
        latitude: u32,
        longitude: u32,
    },
}
```

**Step 4: Add test**

```rust
#[test]
fn test_set_geolocation() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        
        let ip = 0xC0A80101;
        
        // Mint token first
        assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));
        
        // Set geolocation
        assert_ok!(IpToken::set_ip_geolocation(
            RuntimeOrigin::signed(1),
            ip,
            37_7749,  // San Francisco lat * 10000
            122_4194, // San Francisco lon * 10000
        ));
        
        // Verify
        let geo = IpToken::ip_geolocation(ip).unwrap();
        assert_eq!(geo, (37_7749, 122_4194));
    });
}
```

---

#### 2. **Adding a New Threat Level**

**In `pallets/ip-token/src/lib.rs`:**

```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum ThreatLevel {
    Unknown,
    Clean,
    Suspicious,
    Malicious,
    Rehabilitated,
    Critical,        // NEW: Extremely dangerous IPs
}
```

**Update usage:**
```rust
pub fn flag_as_critical(
    origin: OriginFor<T>,
    ip_address: u32,
) -> DispatchResult {
    let _who = ensure_signed(origin)?;
    
    IpTokens::<T>::mutate(ip_address, |token_opt| {
        if let Some(token) = token_opt {
            token.threat_level = ThreatLevel::Critical;
            token.is_malicious = true;
            token.confidence_score = 100;
        }
    });
    
    Ok(())
}
```

---

#### 3. **Adding IPv6 Support**

**Current**: Stores IPv4 as `u32`  
**Goal**: Support IPv6 as `u128`

**Changes needed:**

**Storage:**
```rust
#[pallet::storage]
pub type IpTokensV6<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u128,                                  // IPv6 address
    IpTokenData<BlockNumberFor<T>>,
    OptionQuery,
>;
```

**Extrinsic:**
```rust
pub fn mint_ip_token_v6(
    origin: OriginFor<T>,
    ip_address: u128,
) -> DispatchResult {
    // Similar logic to IPv4 version
}
```

---

#### 4. **Adding Time-Based Auto-Rehabilitation**

**Goal**: Automatically rehabilitate IPs after 30 days of no malicious activity

**Add to `IpTokenData`:**
```rust
pub struct IpTokenData<BlockNumber> {
    // ... existing fields
    
    pub last_malicious_activity: Option<BlockNumber>,
}
```

**Add off-chain worker or hook:**
```rust
#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    fn on_finalize(n: BlockNumberFor<T>) {
        // Check every 1000 blocks
        if n % 1000u32.into() == 0u32.into() {
            Self::auto_rehabilitate_old_threats(n);
        }
    }
}

impl<T: Config> Pallet<T> {
    fn auto_rehabilitate_old_threats(current_block: BlockNumberFor<T>) {
        const REHABILITATION_PERIOD: u32 = 30 * 24 * 60 * 10; // 30 days in 6s blocks
        
        for (ip, mut token) in IpTokens::<T>::iter() {
            if token.is_malicious {
                if let Some(last_activity) = token.last_malicious_activity {
                    let age = current_block.saturating_sub(last_activity);
                    
                    if age > REHABILITATION_PERIOD.into() {
                        token.threat_level = ThreatLevel::Rehabilitated;
                        token.is_malicious = false;
                        IpTokens::<T>::insert(ip, token);
                        
                        MaliciousCount::<T>::mutate(|count| {
                            *count = count.saturating_sub(1);
                        });
                    }
                }
            }
        }
    }
}
```

---

## Configuration Guide

### Runtime Parameters

**File**: `runtime/src/configs/mod.rs`

#### Adjustable Parameters

##### **Block Time**
```rust
// In runtime/src/lib.rs
pub const MILLI_SECS_PER_BLOCK: u64 = 6000;  // Change this

// Options:
// 3000  = 3 seconds (faster, less finality)
// 6000  = 6 seconds (balanced - RECOMMENDED)
// 12000 = 12 seconds (slower, more finality)
```

##### **Bulk Update Limit**
```rust
parameter_types! {
    pub const MaxBulkUpdate: u32 = 10_000;  // Change this
}

// Affects:
// - Maximum IPs in single bulk_update_threats call
// - Memory usage during batch operations
// - Transaction weight
```

##### **Confidence Threshold**
```rust
parameter_types! {
    pub const ConfidenceThreshold: u8 = 75;  // Change this (0-100)
}

// Used for:
// - Auto-flagging decisions
// - Alert thresholds
// - Filtering queries
```

##### **History Buffer Size**
```rust
// In pallets/ip-token/src/lib.rs
pub const MAX_HISTORY_SIZE: u32 = 10;  // Change this

// Affects:
// - Storage per IP token
// - History retention
// - Forensic analysis depth
```

##### **Attack Types Limit**
```rust
pub const MAX_ATTACK_TYPES: u32 = 10;  // Change this

// Affects:
// - How many attack types can be tracked per IP
// - Storage size
```

---

### Genesis Configuration

**File**: `node/src/chain_spec.rs`

```rust
fn testnet_genesis(...) -> RuntimeGenesisConfig {
    RuntimeGenesisConfig {
        system: SystemConfig {
            code: wasm_binary.to_vec(),
            _config: Default::default(),
        },
        
        balances: BalancesConfig {
            balances: endowed_accounts
                .iter()
                .cloned()
                .map(|k| (k, 1 << 60))  // Initial balance
                .collect(),
        },
        
        aura: AuraConfig {
            authorities: initial_authorities
                .iter()
                .map(|x| (x.0.clone()))
                .collect(),
        },
        
        grandpa: GrandpaConfig {
            authorities: initial_authorities
                .iter()
                .map(|x| (x.1.clone(), 1))
                .collect(),
            _config: Default::default(),
        },
        
        sudo: SudoConfig {
            key: Some(root_key),
        },
        
        // Add genesis for IP Token pallet
        ip_token: IpTokenConfig {
            // Initial whitelisted IPs
            whitelisted_ips: vec![
                0x08080808,  // 8.8.8.8 (Google DNS)
                0x08080404,  // 8.8.4.4 (Google DNS)
            ],
        },
        
        // Add genesis for Access Control
        access_control: AccessControlConfig {
            initial_admins: vec![
                get_account_id_from_seed::<sr25519::Public>("Alice"),
            ],
            initial_authorized_nodes: vec![
                get_account_id_from_seed::<sr25519::Public>("AINode"),
            ],
        },
        
        transaction_payment: Default::default(),
    }
}
```

---

## Adding New Features

### Feature: ASN (Autonomous System Number) Tracking

**Goal**: Track which ASN (network provider) each IP belongs to

#### Step 1: Add ASN to Token Data

**In `pallets/ip-token/src/lib.rs`:**

```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct IpTokenData<BlockNumber: Clone + Encode + Decode + MaxEncodedLen> {
    // ... existing fields
    
    pub asn: Option<u32>,  // NEW: ASN number
}
```

#### Step 2: Add Storage for ASN Lookups

```rust
#[pallet::storage]
pub type IpToAsn<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u32,      // IP address
    u32,      // ASN number
    OptionQuery,
>;

#[pallet::storage]
pub type AsnInfo<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    u32,      // ASN number
    AsnData,
    OptionQuery,
>;

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct AsnData {
    pub asn: u32,
    pub name: BoundedVec<u8, ConstU32<100>>,  // ISP name
    pub country_code: u16,
    pub malicious_ip_count: u32,
}
```

#### Step 3: Add Extrinsics

```rust
#[pallet::call_index(8)]
#[pallet::weight(Weight::from_parts(10_000, 0))]
pub fn set_ip_asn(
    origin: OriginFor<T>,
    ip_address: u32,
    asn: u32,
) -> DispatchResult {
    let _who = ensure_signed(origin)?;
    
    IpToAsn::<T>::insert(ip_address, asn);
    
    // Update token if exists
    IpTokens::<T>::mutate(ip_address, |token_opt| {
        if let Some(token) = token_opt {
            token.asn = Some(asn);
        }
    });
    
    Self::deposit_event(Event::AsnSet { ip_address, asn });
    Ok(())
}

#[pallet::call_index(9)]
#[pallet::weight(Weight::from_parts(15_000, 0))]
pub fn register_asn(
    origin: OriginFor<T>,
    asn: u32,
    name: Vec<u8>,
    country_code: u16,
) -> DispatchResult {
    ensure_root(origin)?;  // Only root can register ASNs
    
    let bounded_name = BoundedVec::try_from(name)
        .map_err(|_| Error::<T>::NameTooLong)?;
    
    let asn_data = AsnData {
        asn,
        name: bounded_name,
        country_code,
        malicious_ip_count: 0,
    };
    
    AsnInfo::<T>::insert(asn, asn_data);
    
    Self::deposit_event(Event::AsnRegistered { asn, country_code });
    Ok(())
}
```

#### Step 4: Query Helper

```rust
impl<T: Config> Pallet<T> {
    pub fn get_malicious_ips_by_asn(asn: u32) -> Vec<u32> {
        IpTokens::<T>::iter()
            .filter(|(_, token)| {
                token.is_malicious && token.asn == Some(asn)
            })
            .map(|(ip, _)| ip)
            .collect()
    }
}
```

---

## Testing Guide

### Running Tests

```bash
# Test single pallet
cd pallets/ip-token
cargo test

# Test all pallets
cargo test --all

# Test with output
cargo test -- --nocapture

# Test specific function
cargo test test_mint_ip_token

# Test runtime
cd runtime
cargo test
```

### Writing Effective Tests

```rust
#[test]
fn test_comprehensive_workflow() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        
        // Setup
        let ip = 0xC0A80101;
        let admin = 1u64;
        let ai_node = 2u64;
        
        // Test 1: Authorize AI node
        assert_ok!(AccessControl::add_admin(
            RuntimeOrigin::root(),
            admin
        ));
        assert_ok!(AccessControl::authorize_node(
            RuntimeOrigin::signed(admin),
            ai_node
        ));
        
        // Test 2: AI node flags IP
        assert_ok!(IpToken::update_threat_status(
            RuntimeOrigin::signed(ai_node),
            ip,
            ThreatLevel::Malicious,
            95,
            Some(AttackType::Botnet),
        ));
        
        // Test 3: Verify state
        let token = IpToken::ip_tokens(ip).unwrap();
        assert_eq!(token.threat_level, ThreatLevel::Malicious);
        assert_eq!(token.flagged_count, 1);
        assert_eq!(IpToken::malicious_count(), 1);
        
        // Test 4: Rehabilitate
        System::set_block_number(1000);
        assert_ok!(IpToken::rehabilitate_ip(
            RuntimeOrigin::signed(ai_node),
            ip
        ));
        
        let token = IpToken::ip_tokens(ip).unwrap();
        assert_eq!(token.threat_level, ThreatLevel::Rehabilitated);
        assert!(!token.is_malicious);
    });
}
```

---

## Deployment Guide

### 1. **Build the Project**

```bash
cd /home/sonu/saviour/bloc-saviour

# Build in release mode
cargo build --release

# Output: ./target/release/solochain-template-node
```

### 2. **Generate Chain Specification**

```bash
# Generate raw chain spec
./target/release/solochain-template-node build-spec --chain dev > chain-spec.json

# Convert to raw format
./target/release/solochain-template-node build-spec \
    --chain chain-spec.json --raw > chain-spec-raw.json
```

### 3. **Run Development Node**

```bash
# Single node development
./target/release/solochain-template-node --dev

# With custom data directory
./target/release/solochain-template-node --dev \
    --base-path /tmp/bloc-saviour

# Purge chain data
./target/release/solochain-template-node purge-chain --dev
```

### 4. **Run Multi-Node Network**

**Node 1 (Alice):**
```bash
./target/release/solochain-template-node \
    --base-path /tmp/alice \
    --chain chain-spec-raw.json \
    --alice \
    --port 30333 \
    --rpc-port 9944 \
    --node-key 0000000000000000000000000000000000000000000000000000000000000001
```

**Node 2 (Bob):**
```bash
./target/release/solochain-template-node \
    --base-path /tmp/bob \
    --chain chain-spec-raw.json \
    --bob \
    --port 30334 \
    --rpc-port 9945 \
    --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/12D3KooW...
```

### 5. **Production Deployment**

**systemd service file** (`/etc/systemd/system/bloc-saviour.service`):

```ini
[Unit]
Description=Bloc Saviour Blockchain Node
After=network.target

[Service]
Type=simple
User=blockchain
WorkingDirectory=/opt/bloc-saviour
ExecStart=/opt/bloc-saviour/solochain-template-node \
    --base-path /var/lib/bloc-saviour \
    --chain /etc/bloc-saviour/chain-spec-raw.json \
    --validator \
    --name "Validator-01" \
    --rpc-external \
    --rpc-cors all \
    --rpc-methods Safe
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable bloc-saviour
sudo systemctl start bloc-saviour
sudo systemctl status bloc-saviour
```

---

## Common Development Tasks

### Task 1: Change Maximum Bulk Update Size

**Files to edit:**
1. `runtime/src/configs/mod.rs`
2. `pallets/ip-token/src/lib.rs`

```rust
// runtime/src/configs/mod.rs
parameter_types! {
    pub const MaxBulkUpdate: u32 = 50_000;  // Changed from 10,000
}

// pallets/ip-token/src/lib.rs
pub const MAX_BULK_UPDATE: u32 = 50_000;  // Update constant
```

**Test:**
```bash
cargo test test_bulk_update
```

---

### Task 2: Add New Event

```rust
// In pallets/ip-token/src/lib.rs

#[pallet::event]
pub enum Event<T: Config> {
    // ... existing events
    
    IpFlaggedAsBot {
        ip_address: u32,
        bot_type: BotType,
        timestamp: BlockNumberFor<T>,
    },
}

// Emit event
Self::deposit_event(Event::IpFlaggedAsBot {
    ip_address: ip,
    bot_type: BotType::Scraper,
    timestamp: current_block,
});
```

---

### Task 3: Query All Malicious IPs

**Add helper function:**
```rust
impl<T: Config> Pallet<T> {
    pub fn get_all_malicious_ips(limit: u32) -> Vec<(u32, ThreatLevel, u8)> {
        IpTokens::<T>::iter()
            .filter(|(_, token)| token.is_malicious)
            .take(limit as usize)
            .map(|(ip, token)| (ip, token.threat_level, token.confidence_score))
            .collect()
    }
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "pallet not found in runtime"

**Solution:** Add pallet to runtime assembly in `runtime/src/lib.rs`:
```rust
#[runtime::pallet_index(10)]
pub type YourPallet = your_pallet;
```

#### Issue 2: "trait bound not satisfied"

**Solution:** Implement required trait or add trait bound:
```rust
pub struct YourType<T: Clone + Encode + Decode> {
    // ...
}
```

#### Issue 3: "storage not found"

**Solution:** Ensure storage is properly defined with `#[pallet::storage]` macro

#### Issue 4: Weight errors

**Solution:** Use proper Weight syntax:
```rust
#[pallet::weight(Weight::from_parts(10_000, 0))]
```

---

## Summary

### Key Files by Function

| Function | Files |
|----------|-------|
| **IP Token Logic** | `pallets/ip-token/src/lib.rs` |
| **Authorization** | `pallets/access-control/src/lib.rs` |
| **Runtime Assembly** | `runtime/src/lib.rs` |
| **Configuration** | `runtime/src/configs/mod.rs` |
| **Genesis Setup** | `node/src/chain_spec.rs` |
| **Tests** | `pallets/*/src/tests.rs` |
| **RPC** | `node/src/rpc.rs` |

### Quick Reference

**Add Storage:**
```rust
#[pallet::storage]
pub type YourStorage<T: Config> = StorageMap<_, Blake2_128Concat, KeyType, ValueType>;
```

**Add Function:**
```rust
#[pallet::call_index(X)]
#[pallet::weight(Weight::from_parts(10_000, 0))]
pub fn your_function(origin: OriginFor<T>, param: Type) -> DispatchResult {
    let who = ensure_signed(origin)?;
    // Logic
    Ok(())
}
```

**Add Event:**
```rust
#[pallet::event]
pub enum Event<T: Config> {
    YourEvent { field: Type },
}
```

**Add Error:**
```rust
#[pallet::error]
pub enum Error<T> {
    YourError,
}
```

**Add Test:**
```rust
#[test]
fn test_your_feature() {
    new_test_ext().execute_with(|| {
        // Test logic
    });
}
```

---

**This guide covers the complete blockchain implementation. Use it as a reference for understanding, modifying, and extending the Bloc-Saviour DDoS prevention blockchain.**
