#!/bin/bash

echo "🔗 BlocSaviour Frontend-Blockchain Integration Script"
echo "======================================================"
echo ""

# Check if blockchain is running
echo "1️⃣  Checking if blockchain is running..."
if curl -s -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_chain"}' http://127.0.0.1:9944 > /dev/null 2>&1; then
    echo "✅ Blockchain is running!"
else
    echo "❌ Blockchain is NOT running!"
    echo ""
    echo "Please start the blockchain first:"
    echo "  cd /home/sonu/saviour/bloc-saviour"
    echo "  ./target/release/solochain-template-node --dev"
    echo ""
    exit 1
fi

echo ""
echo "2️⃣  Installing Polkadot.js dependencies..."
bun install --save @polkadot/api @polkadot/extension-dapp @polkadot/util @polkadot/util-crypto

echo ""
echo "3️⃣  Creating blockchain integration files..."

# Create real blockchain API
cat > lib/api/blockchain-real.ts << 'EOF'
import { ApiPromise, WsProvider } from '@polkadot/api';
import { IpTokenData, BlockchainStats, Transaction, ThreatLevel } from '../types/blockchain';
import { u32ToIp, ipToU32 } from '../utils/blockchain-utils';

export class BlocSaviourAPI {
  private api: ApiPromise | null = null;
  private wsUrl: string;

  constructor(wsUrl: string = 'ws://127.0.0.1:9944') {
    this.wsUrl = wsUrl;
  }

  async connect(): Promise<void> {
    if (this.api) return;

    try {
      const provider = new WsProvider(this.wsUrl);
      this.api = await ApiPromise.create({ provider });
      console.log('✅ Connected to BlocSaviour blockchain');
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
  }

  async getStats(): Promise<BlockchainStats> {
    await this.connect();

    const latestHeader = await this.api!.rpc.chain.getHeader();
    const blockNumber = latestHeader.number.toNumber();

    const entries = await this.api!.query.ipToken.ipTokens.entries();

    let maliciousCount = 0;
    let cleanCount = 0;
    let suspiciousCount = 0;

    entries.forEach(([, value]) => {
      const token = value.unwrap();
      const threatLevel = token.threat_level.toString();

      if (threatLevel === 'Malicious') maliciousCount++;
      else if (threatLevel === 'Clean') cleanCount++;
      else if (threatLevel === 'Suspicious') suspiciousCount++;
    });

    return {
      total_tokens: entries.length,
      malicious_count: maliciousCount,
      clean_count: cleanCount,
      suspicious_count: suspiciousCount,
      latest_block: blockNumber,
      total_transactions: 0,
    };
  }

  async getIpToken(ipAddress: string): Promise<IpTokenData | null> {
    await this.connect();

    const ipU32 = ipToU32(ipAddress);
    const tokenOption = await this.api!.query.ipToken.ipTokens(ipU32);

    if (tokenOption.isNone) return null;

    const token = tokenOption.unwrap();

    return {
      ip_address: ipU32,
      ip_string: ipAddress,
      token_id: token.token_id.toNumber(),
      first_seen: token.first_seen.toNumber(),
      threat_level: this.mapThreatLevel(token.threat_level.toString()),
      is_malicious: token.is_malicious.valueOf(),
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
    };
  }

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

  isConnected(): boolean {
    return this.api !== null && this.api.isConnected;
  }
}
EOF

echo "✅ Created lib/api/blockchain-real.ts"

# Create environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_BLOCKCHAIN_WS_URL=ws://127.0.0.1:9944
EOF

echo "✅ Created .env.local"

echo ""
echo "4️⃣  Integration complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Replace the mock API with real API in your components"
echo "  2. Import from 'lib/api/blockchain-real' instead of 'lib/api/blockchain'"
echo "  3. Start the dev server: bun run dev"
echo "  4. Check the browser console for connection status"
echo ""
echo "📖 Read BLOCKCHAIN_INTEGRATION.md for full documentation"
echo ""
echo "✅ Done!"
