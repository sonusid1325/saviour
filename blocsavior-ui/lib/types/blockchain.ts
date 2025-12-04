// Types for Bloc Saviour blockchain

// Threat level as lowercase strings returned by blockchain
export type ThreatLevel = 'clean' | 'suspicious' | 'malicious' | 'rehabilitated' | 'unknown';

// Attack types
export type AttackType = 'SYN_FLOOD' | 'UDP_FLOOD' | 'HTTP_FLOOD' | 'BOTNET' | 'PORT_SCAN' | 'BRUTE_FORCE' | 'OTHER';

export interface HistoryEntry {
  blockNumber: number;
  oldStatus: ThreatLevel;
  newStatus: ThreatLevel;
  reason: string;
}

export interface IpTokenData {
  ipAddress: string;
  tokenId: number;
  firstSeen: number;
  threatLevel: ThreatLevel;
  isMalicious: boolean;
  confidenceScore: number;
  attackTypes: AttackType[];
  lastUpdated: number;
  flaggedCount: number;
  falsePositiveCount: number;
  history: HistoryEntry[];
}

export interface BlockchainStats {
  totalIps?: number;
  maliciousIps?: number;
  cleanIps?: number;
  recentActivity?: number;
  lastUpdate?: number;
  blockHeight?: number;
  // Legacy snake_case fields
  total_tokens?: number;
  malicious_count?: number;
  clean_count?: number;
  suspicious_count?: number;
  latest_block?: number;
  total_transactions?: number;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  type: string;
  from: string;
  status: 'success' | 'failed' | 'pending';
  ipAddress: string;
  details: string;
  // Legacy fields
  block_number?: number;
  extrinsic?: string;
  method?: string;
  args?: any;
  success?: boolean;
  events?: any[];
}

export interface SearchResult {
  type: "ip" | "transaction" | "block";
  data: IpTokenData | Transaction | any;
}
