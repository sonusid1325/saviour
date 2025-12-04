// Mock API client for Bloc Saviour blockchain
// TODO: Replace with actual Polkadot.js API integration

import { IpTokenData, BlockchainStats, Transaction, ThreatLevel, AttackType } from '../types/blockchain';
import { u32ToIp } from '../utils/blockchain-utils';

// Mock data generator
function generateMockIpTokens(count: number): IpTokenData[] {
  const tokens: IpTokenData[] = [];
  const threatLevels: ThreatLevel[] = ['clean', 'suspicious', 'malicious', 'rehabilitated', 'unknown'];
  const attackTypes: AttackType[] = ['SYN_FLOOD', 'UDP_FLOOD', 'HTTP_FLOOD', 'BOTNET', 'PORT_SCAN', 'BRUTE_FORCE', 'OTHER'];

  for (let i = 0; i < count; i++) {
    const ipNum = 0xC0A80100 + i; // 192.168.1.x
    const threatLevel = threatLevels[Math.floor(Math.random() * threatLevels.length)];
    const isMalicious = threatLevel === 'malicious' || threatLevel === 'suspicious';

    tokens.push({
      ipAddress: u32ToIp(ipNum),
      tokenId: i,
      firstSeen: 1000 + i * 10,
      threatLevel: threatLevel,
      isMalicious: isMalicious,
      confidenceScore: Math.floor(Math.random() * 100),
      attackTypes: isMalicious ? [attackTypes[Math.floor(Math.random() * attackTypes.length)]] : [],
      lastUpdated: 1000 + i * 10 + Math.floor(Math.random() * 100),
      flaggedCount: isMalicious ? Math.floor(Math.random() * 10) : 0,
      falsePositiveCount: Math.floor(Math.random() * 3),
      history: [
        {
          blockNumber: 1000 + i * 10,
          oldStatus: 'unknown',
          newStatus: threatLevel,
          reason: 'Initial scan',
        }
      ]
    });
  }

  return tokens;
}

// Mock blockchain stats
let mockTokens = generateMockIpTokens(100);

export class BlocSaviourAPI {
  private wsUrl: string;

  constructor(wsUrl: string = 'ws://127.0.0.1:9944') {
    this.wsUrl = wsUrl;
  }

  /**
   * Get blockchain statistics
   */
  async getStats(): Promise<BlockchainStats> {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

    const maliciousCount = mockTokens.filter(t => t.isMalicious).length;
    const cleanCount = mockTokens.filter(t => t.threatLevel === 'clean').length;
    const suspiciousCount = mockTokens.filter(t => t.threatLevel === 'suspicious').length;

    return {
      total_tokens: mockTokens.length,
      malicious_count: maliciousCount,
      clean_count: cleanCount,
      suspicious_count: suspiciousCount,
      latest_block: 5420,
      total_transactions: 12543,
    };
  }

  /**
   * Get all IP tokens with optional filtering
   */
  async getIpTokens(params?: {
    threat_level?: ThreatLevel;
    limit?: number;
    offset?: number;
  }): Promise<IpTokenData[]> {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 300));

    let filtered = [...mockTokens];

    if (params?.threat_level) {
      filtered = filtered.filter(t => t.threatLevel === params.threat_level);
    }

    const offset = params?.offset || 0;
    const limit = params?.limit || 50;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get malicious IPs only
   */
  async getMaliciousIps(limit: number = 100): Promise<IpTokenData[]> {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 300));

    return mockTokens
      .filter(t => t.isMalicious)
      .slice(0, limit);
  }

  /**
   * Get IP token by IP address
   */
  async getIpToken(ipAddress: string): Promise<IpTokenData | null> {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 300));

    return mockTokens.find(t => t.ipAddress === ipAddress) || null;
  }

  /**
   * Search for IP tokens
   */
  async searchIpTokens(query: string): Promise<IpTokenData[]> {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 300));

    return mockTokens.filter(t =>
      t.ipAddress.includes(query) ||
      t.tokenId.toString().includes(query)
    );
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 20): Promise<Transaction[]> {
    // TODO: Implement actual API call
    await new Promise(resolve => setTimeout(resolve, 300));

    const transactions: Transaction[] = [];
    for (let i = 0; i < limit; i++) {
      transactions.push({
        hash: `0x${Math.random().toString(16).slice(2, 66)}`,
        blockNumber: 5420 - i,
        timestamp: Date.now() - i * 60000,
        type: 'IpToken.updateThreatStatus',
        from: '0x' + Math.random().toString(16).slice(2, 42),
        status: Math.random() > 0.1 ? 'success' : 'failed',
        ipAddress: `192.168.1.${i}`,
        details: 'updateThreatStatus',
        // Legacy
        block_number: 5420 - i,
        method: 'updateThreatStatus',
        args: { ip_address: `192.168.1.${i}`, threat_level: 'Malicious' },
        success: Math.random() > 0.1,
        events: [],
      });
    }
    return transactions;
  }

  /**
   * Check if blockchain is connected
   */
  async isConnected(): Promise<boolean> {
    // TODO: Implement actual connection check
    return true;
  }
}

// Export singleton instance
export const api = new BlocSaviourAPI();
