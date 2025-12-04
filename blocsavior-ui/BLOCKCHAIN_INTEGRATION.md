# Blockchain Integration Guide

This guide explains how to connect the BlocSaviour frontend to your running Substrate blockchain.

## Prerequisites

1. **Blockchain must be running:**
```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node --dev
```

This will start the node on `ws://127.0.0.1:9944`

2. **Install Polkadot.js dependencies:**
```bash
cd /home/sonu/saviour/blocsavior-ui
npm install @polkadot/api @polkadot/extension-dapp @polkadot/util @polkadot/util-crypto
```

## Step 1: Replace Mock API with Real API

Create `/lib/api/blockchain-real.ts`:

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
import { IpTokenData, BlockchainStats, Transaction, ThreatLevel } from '../types/blockchain';
import { u32ToIp, ipToU32 } from '../utils/blockchain-utils';

export class BlocSaviourAPI {
  private api: ApiPromise | null = null;
  private wsUrl: string;
  
  constructor(wsUrl: string = 'ws://127.0.0.1:9944') {
    this.wsUrl = wsUrl;
  }
  
  /**
   * Connect to the blockchain
   */
  async connect(): Promise<void> {
    if (this.api) return;
    
    try {
      const provider = new WsProvider(this.wsUrl);
      this.api = await ApiPromise.create({ provider });
      console.log('✅ Connected to BlocSaviour blockchain');
      console.log(`Chain: ${await this.api.rpc.system.chain()}`);
      console.log(`Version: ${await this.api.rpc.system.version()}`);
    } catch (error) {
      console.error('Failed to connect to blockchain:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from blockchain
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      console.log('Disconnected from blockchain');
    }
  }
  
  /**
   * Get blockchain statistics
   */
  async getStats(): Promise<BlockchainStats> {
    await this.connect();
    
    try {
      // Get latest block
      const latestHeader = await this.api!.rpc.chain.getHeader();
      const blockNumber = latestHeader.number.toNumber();
      
      // Get all IP tokens
      const entries = await this.api!.query.ipToken.ipTokens.entries();
      
      let maliciousCount = 0;
      let cleanCount = 0;
      let suspiciousCount = 0;
      let unknownCount = 0;
      
      entries.forEach(([key, value]) => {
        const token = value.unwrap();
        const threatLevel = token.threat_level.toString();
        
        if (threatLevel === 'Malicious') maliciousCount++;
        else if (threatLevel === 'Clean') cleanCount++;
        else if (threatLevel === 'Suspicious') suspiciousCount++;
        else unknownCount++;
      });
      
      return {
        total_tokens: entries.length,
        malicious_count: maliciousCount,
        clean_count: cleanCount,
        suspicious_count: suspiciousCount,
        latest_block: blockNumber,
        total_transactions: 0, // Can be calculated from blocks if needed
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
  
  /**
   * Get specific IP token data
   */
  async getIpToken(ipAddress: string): Promise<IpTokenData | null> {
    await this.connect();
    
    try {
      const ipU32 = ipToU32(ipAddress);
      const tokenOption = await this.api!.query.ipToken.ipTokens(ipU32);
      
      if (tokenOption.isNone) {
        return null;
      }
      
      const token = tokenOption.unwrap();
      
      // Map blockchain data to frontend types
      const threatLevel = this.mapThreatLevel(token.threat_level.toString());
      const attackTypes = token.attack_types.map((t: any) => t.toString());
      
      return {
        ip_address: ipU32,
        ip_string: ipAddress,
        token_id: token.token_id.toNumber(),
        first_seen: token.first_seen.toNumber(),
        threat_level: threatLevel,
        is_malicious: token.is_malicious.valueOf(),
        confidence_score: token.confidence_score.toNumber(),
        attack_types: attackTypes,
        last_updated: token.last_updated.toNumber(),
        flagged_count: token.flagged_count.toNumber(),
        false_positive_count: token.false_positive_count.toNumber(),
        history: token.history.map((h: any) => ({
          block_number: h.block_number.toNumber(),
          old_status: this.mapThreatLevel(h.old_status.toString()),
          new_status: this.mapThreatLevel(h.new_status.toString()),
          confidence: h.confidence.toNumber(),
        })),
      };
    } catch (error) {
      console.error(`Error fetching IP ${ipAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all malicious IPs
   */
  async getMaliciousIps(limit: number = 100): Promise<IpTokenData[]> {
    await this.connect();
    
    try {
      const entries = await this.api!.query.ipToken.ipTokens.entries();
      const maliciousTokens: IpTokenData[] = [];
      
      for (const [key, value] of entries) {
        const token = value.unwrap();
        
        if (token.is_malicious.valueOf()) {
          const ipU32 = token.ip_address.toNumber();
          
          maliciousTokens.push({
            ip_address: ipU32,
            ip_string: u32ToIp(ipU32),
            token_id: token.token_id.toNumber(),
            first_seen: token.first_seen.toNumber(),
            threat_level: this.mapThreatLevel(token.threat_level.toString()),
            is_malicious: true,
            confidence_score: token.confidence_score.toNumber(),
            attack_types: token.attack_types.map((t: any) => t.toString()),
            last_updated: token.last_updated.toNumber(),
            flagged_count: token.flagged_count.toNumber(),
            false_positive_count: token.false_positive_count.toNumber(),
            history: token.history.map((h: any) => ({
              block_number: h.block_number.toNumber(),
              old_status: this.mapThreatLevel(h.old_status.toString()),
              new_status: this.mapThreatLevel(h.new_status.toString()),
              confidence: h.confidence.toNumber(),
            })),
          });
          
          if (maliciousTokens.length >= limit) break;
        }
      }
      
      return maliciousTokens;
    } catch (error) {
      console.error('Error fetching malicious IPs:', error);
      throw error;
    }
  }
  
  /**
   * Get recent transactions (from blocks)
   */
  async getRecentTransactions(limit: number = 20): Promise<Transaction[]> {
    await this.connect();
    
    try {
      const latestHeader = await this.api!.rpc.chain.getHeader();
      const currentBlock = latestHeader.number.toNumber();
      
      const transactions: Transaction[] = [];
      const startBlock = Math.max(1, currentBlock - limit);
      
      for (let i = currentBlock; i >= startBlock && transactions.length < limit; i--) {
        const blockHash = await this.api!.rpc.chain.getBlockHash(i);
        const block = await this.api!.rpc.chain.getBlock(blockHash);
        
        block.block.extrinsics.forEach((extrinsic, index) => {
          const method = extrinsic.method;
          
          // Only show IP Token related transactions
          if (method.section === 'ipToken') {
            transactions.push({
              hash: extrinsic.hash.toString(),
              block_number: i,
              timestamp: Date.now() - (currentBlock - i) * 6000, // Assuming 6s block time
              from: '', // Can extract from extrinsic if needed
              to: '',
              method: `${method.section}.${method.method}`,
              success: true,
            });
          }
        });
      }
      
      return transactions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }
  
  /**
   * Subscribe to new blocks
   */
  async subscribeToNewBlocks(callback: (blockNumber: number) => void): Promise<() => void> {
    await this.connect();
    
    const unsub = await this.api!.rpc.chain.subscribeNewHeads((header) => {
      callback(header.number.toNumber());
    });
    
    return unsub;
  }
  
  /**
   * Helper: Map blockchain threat level to frontend enum
   */
  private mapThreatLevel(level: string): ThreatLevel {
    switch (level) {
      case 'Unknown': return ThreatLevel.Unknown;
      case 'Clean': return ThreatLevel.Clean;
      case 'Suspicious': return ThreatLevel.Suspicious;
      case 'Malicious': return ThreatLevel.Malicious;
      case 'Rehabilitated': return ThreatLevel.Rehabilitated;
      default: return ThreatLevel.Unknown;
    }
  }
  
  /**
   * Check if blockchain is connected
   */
  isConnected(): boolean {
    return this.api !== null && this.api.isConnected;
  }
}
```

## Step 2: Create a Provider Component

Create `/components/providers/blockchain-provider.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { BlocSaviourAPI } from '@/lib/api/blockchain-real';

interface BlockchainContextType {
  api: BlocSaviourAPI | null;
  isConnected: boolean;
  latestBlock: number;
}

const BlockchainContext = createContext<BlockchainContextType>({
  api: null,
  isConnected: false,
  latestBlock: 0,
});

export function useBlockchain() {
  return useContext(BlockchainContext);
}

export function BlockchainProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<BlocSaviourAPI | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestBlock, setLatestBlock] = useState(0);
  
  useEffect(() => {
    const blocApi = new BlocSaviourAPI();
    
    // Connect to blockchain
    blocApi.connect()
      .then(() => {
        setApi(blocApi);
        setIsConnected(true);
        
        // Subscribe to new blocks
        blocApi.subscribeToNewBlocks((blockNumber) => {
          setLatestBlock(blockNumber);
        });
      })
      .catch((error) => {
        console.error('Failed to connect to blockchain:', error);
        setIsConnected(false);
      });
    
    return () => {
      if (blocApi) {
        blocApi.disconnect();
      }
    };
  }, []);
  
  return (
    <BlockchainContext.Provider value={{ api, isConnected, latestBlock }}>
      {children}
    </BlockchainContext.Provider>
  );
}
```

## Step 3: Update Root Layout

Wrap your app in `/app/layout.tsx`:

```typescript
import { BlockchainProvider } from '@/components/providers/blockchain-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BlockchainProvider>
          {children}
        </BlockchainProvider>
      </body>
    </html>
  );
}
```

## Step 4: Use in Components

Example usage in a page component:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useBlockchain } from '@/components/providers/blockchain-provider';
import { BlockchainStats } from '@/lib/types/blockchain';

export default function DashboardPage() {
  const { api, isConnected, latestBlock } = useBlockchain();
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  
  useEffect(() => {
    if (api && isConnected) {
      api.getStats().then(setStats);
    }
  }, [api, isConnected, latestBlock]); // Refresh when new block arrives
  
  if (!isConnected) {
    return <div>Connecting to blockchain...</div>;
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Latest Block: {latestBlock}</p>
      {stats && (
        <div>
          <p>Total IPs: {stats.total_tokens}</p>
          <p>Malicious: {stats.malicious_count}</p>
          <p>Clean: {stats.clean_count}</p>
        </div>
      )}
    </div>
  );
}
```

## Step 5: Environment Configuration

Create `.env.local`:

```bash
NEXT_PUBLIC_BLOCKCHAIN_WS_URL=ws://127.0.0.1:9944
```

Update API initialization:

```typescript
const api = new BlocSaviourAPI(process.env.NEXT_PUBLIC_BLOCKCHAIN_WS_URL);
```

## Testing the Connection

1. **Start blockchain:**
```bash
cd /home/sonu/saviour/bloc-saviour
./target/release/solochain-template-node --dev
```

2. **Start frontend:**
```bash
cd /home/sonu/saviour/blocsavior-ui
npm run dev
```

3. **Check console** for connection messages:
```
✅ Connected to BlocSaviour blockchain
Chain: Development
Version: 4.0.0-dev
```

## Troubleshooting

### Connection Failed
- Ensure blockchain is running
- Check WebSocket URL (default: `ws://127.0.0.1:9944`)
- Check browser console for CORS errors

### Data Not Showing
- Blockchain might be empty (no IPs minted yet)
- Use Polkadot.js Apps to mint test data
- Check browser console for API errors

### Type Errors
- Ensure @polkadot/api is installed
- Check that blockchain types match frontend types
- Verify enum mappings (ThreatLevel, AttackType)

## What the Blockchain Stores

The blockchain stores:
- **All IPs encountered** (only malicious or flagged ones - lazy minting)
- **Threat levels** (Unknown, Clean, Suspicious, Malicious, Rehabilitated)
- **Attack types** (SYN_FLOOD, UDP_FLOOD, HTTP_FLOOD, BOTNET, etc.)
- **History** (last 10 status changes per IP)
- **Confidence scores** (0-100)
- **Flagging counts**

Each IP is stored as a token (NFT-like) with immutable creation data and mutable threat metadata.

## Next Steps

1. Install Polkadot.js packages
2. Replace mock API with real API
3. Test connection to running blockchain
4. Mint some test IPs to see data flow
5. Build UI features around real blockchain data

## Useful Commands

```bash
# Build blockchain
cd /home/sonu/saviour/bloc-saviour
cargo build --release

# Run blockchain (dev mode)
./target/release/solochain-template-node --dev

# Purge chain data (fresh start)
./target/release/solochain-template-node purge-chain --dev

# Access Polkadot.js Apps UI
# Open: https://polkadot.js.org/apps
# Connect to: ws://127.0.0.1:9944
```
