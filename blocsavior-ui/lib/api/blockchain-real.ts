import { ApiPromise, WsProvider } from '@polkadot/api';
import type { IpTokenData, BlockchainStats, Transaction, ThreatLevel, AttackType } from '../types/blockchain';
import { u32ToIp, ipToU32 } from '../utils/blockchain-utils';

class BlocSaviourAPIClass {
  private api: ApiPromise | null = null;
  private wsUrl: string;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(wsUrl: string = 'ws://127.0.0.1:9944') {
    this.wsUrl = wsUrl;
  }

  async connect(): Promise<void> {
    if (this.api?.isConnected) return;

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = (async () => {
      try {
        const provider = new WsProvider(this.wsUrl);
        this.api = await ApiPromise.create({ provider });
        await this.api.isReady;
        console.log('✅ Connected to BlocSaviour blockchain');
      } catch (error) {
        console.error('Failed to connect to blockchain:', error);
        this.api = null;
        throw error;
      } finally {
        this.isConnecting = false;
      }
    })();

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
  }

  private formatIpTokenData(ipString: string, data: any): IpTokenData {
    // Convert threat level to lowercase string
    let threatLevel: ThreatLevel = 'unknown';
    if (data.threatLevel) {
      const level = data.threatLevel.toString().toLowerCase();
      if (['clean', 'suspicious', 'malicious', 'rehabilitated', 'unknown'].includes(level)) {
        threatLevel = level as ThreatLevel;
      }
    }

    return {
      ipAddress: ipString,
      tokenId: data.tokenId || 0,
      firstSeen: data.firstSeen || 0,
      lastUpdated: data.lastUpdated || data.firstSeen || 0,
      threatLevel: threatLevel,
      confidenceScore: data.confidenceScore || 0,
      isMalicious: data.isMalicious || false,
      attackTypes: (data.attackTypes || []) as AttackType[],
      flaggedCount: data.flaggedCount || 0,
      falsePositiveCount: data.falsePositiveCount || 0,
      history: [],
    };
  }

  async getBlockNumber(): Promise<number> {
    await this.connect();
    const header = await this.api!.rpc.chain.getHeader();
    return header.number.toNumber();
  }

  async getTotalIpCount(): Promise<number> {
    await this.connect();
    const entries = await this.api!.query.ipToken.ipTokens.entries();
    return entries.length;
  }

  async getMaliciousIpCount(): Promise<number> {
    await this.connect();
    const result = await this.api!.query.ipToken.maliciousCount();
    return (result as any).toNumber();
  }

  async getCleanIpCount(): Promise<number> {
    await this.connect();
    const entries = await this.api!.query.ipToken.ipTokens.entries();
    let cleanCount = 0;
    entries.forEach(([, value]) => {
      const token = value.toJSON() as any;
      if (token.threatLevel === 'Clean') cleanCount++;
    });
    return cleanCount;
  }

  async getStats(): Promise<BlockchainStats> {
    await this.connect();

    const [blockNumber, entries] = await Promise.all([
      this.getBlockNumber(),
      this.api!.query.ipToken.ipTokens.entries()
    ]);

    let maliciousCount = 0;
    let cleanCount = 0;
    let suspiciousCount = 0;

    entries.forEach(([, value]) => {
      const token = value.toJSON() as any;
      const threatLevel = token.threatLevel || 'Unknown';

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

    try {
      const ipU32 = ipToU32(ipAddress);
      const result = await this.api!.query.ipToken.ipTokens(ipU32);

      if (result.isEmpty) {
        return null;
      }

      const data = result.toJSON() as any;
      return this.formatIpTokenData(ipAddress, data);
    } catch (error) {
      console.error('Error fetching IP token:', error);
      return null;
    }
  }

  async getAllTokens(limit: number = 100): Promise<IpTokenData[]> {
    await this.connect();

    try {
      const entries = await this.api!.query.ipToken.ipTokens.entries();
      const tokens: IpTokenData[] = [];

      for (const [key, value] of entries.slice(0, limit)) {
        const ipU32 = (key.toHuman() as any[])[0];
        const ipString = u32ToIp(parseInt(ipU32.replace(/,/g, '')));
        const data = value.toJSON() as any;
        tokens.push(this.formatIpTokenData(ipString, data));
      }

      return tokens.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (error) {
      console.error('Error fetching all tokens:', error);
      return [];
    }
  }

  async getAllMaliciousIps(): Promise<IpTokenData[]> {
    await this.connect();

    try {
      const entries = await this.api!.query.ipToken.ipTokens.entries();
      const maliciousIps: IpTokenData[] = [];

      for (const [key, value] of entries) {
        const data = value.toJSON() as any;
        if (data.isMalicious || data.threatLevel === 'Malicious') {
          const ipU32 = (key.toHuman() as any[])[0];
          const ipString = u32ToIp(parseInt(ipU32.replace(/,/g, '')));
          maliciousIps.push(this.formatIpTokenData(ipString, data));
        }
      }

      return maliciousIps.sort((a, b) => b.confidenceScore - a.confidenceScore);
    } catch (error) {
      console.error('Error fetching malicious IPs:', error);
      return [];
    }
  }

  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    await this.connect();

    try {
      const blockNumber = await this.getBlockNumber();
      const transactions: Transaction[] = [];

      const blocksToCheck = Math.min(10, blockNumber);

      for (let i = 0; i < blocksToCheck && transactions.length < limit; i++) {
        const blockHash = await this.api!.rpc.chain.getBlockHash(blockNumber - i);
        const signedBlock = await this.api!.rpc.chain.getBlock(blockHash);
        const allRecords = await this.api!.query.system.events.at(blockHash);

        signedBlock.block.extrinsics.forEach((extrinsic, index) => {
          const { method: { method, section } } = extrinsic;

          if (section === 'ipToken') {
            const extrinsicEvents = (allRecords as any).filter(({ phase }: any) =>
              phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
            );

            const success = extrinsicEvents.some(({ event }: any) =>
              this.api!.events.system.ExtrinsicSuccess.is(event)
            );

            transactions.push({
              hash: extrinsic.hash.toHex(),
              blockNumber: blockNumber - i,
              block_number: blockNumber - i, // Backward compat
              method: `${section}.${method}`,
              timestamp: Date.now() - (i * 6000),
              status: success ? 'success' : 'failed',
              from: extrinsic.signer.toString(),
              type: 'Transaction',
              ipAddress: 'Unknown',
              details: `${section}.${method}`,
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

  async isWhitelisted(ipAddress: string): Promise<boolean> {
    await this.connect();
    try {
      const ipU32 = ipToU32(ipAddress);
      const result = await this.api!.query.ipToken.whitelist(ipU32);
      return (result as any).isTrue;
    } catch (error) {
      return false;
    }
  }

  async getServerTokens(serverUrl: string): Promise<IpTokenData[]> {
    try {
      const response = await fetch(`${serverUrl}/api/nfts`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (!data.nfts || !Array.isArray(data.nfts)) {
        return [];
      }

      return data.nfts.map((nft: any) => ({
        ipAddress: nft.ipAddress,
        tokenId: nft.tokenId,
        firstSeen: nft.firstSeen,
        lastUpdated: nft.lastUpdated,
        threatLevel: (nft.threatLevel || 'unknown') as ThreatLevel,
        confidenceScore: nft.confidenceScore || 0,
        isMalicious: nft.isMalicious || false,
        attackTypes: (nft.attackTypes || []) as AttackType[],
        flaggedCount: nft.flaggedCount || 0,
        falsePositiveCount: nft.falsePositiveCount || 0,
        history: nft.history || []
      }));
    } catch (error) {
      console.error('Error fetching tokens from server:', error);
      return [];
    }
  }

  // Alias for getIpToken to match usage in search page
  async getIpReputation(ipAddress: string): Promise<IpTokenData | null> {
    return this.getIpToken(ipAddress);
  }

  // Mock implementation of reportIp since we don't have wallet integration here yet
  async reportIp(ipAddress: string, data: any): Promise<{ isNew: boolean; txHash: string }> {
    console.log('Reporting IP:', ipAddress, data);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      isNew: true,
      txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    };
  }
}

export const BlocSaviourAPI = new BlocSaviourAPIClass();
