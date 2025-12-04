// Utility functions for Bloc Saviour

/**
 * Convert dotted IP address (192.168.1.1) to u32 integer
 */
export function ipToU32(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
    throw new Error('Invalid IP address');
  }
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Convert u32 integer to dotted IP address
 */
export function u32ToIp(num: number): string {
  return [
    (num >> 24) & 0xFF,
    (num >> 16) & 0xFF,
    (num >> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

/**
 * Format block number with commas
 */
export function formatBlockNumber(blockNumber: number | undefined): string {
  if (blockNumber === undefined || blockNumber === null) {
    return '0';
  }
  return blockNumber.toLocaleString();
}

/**
 * Format timestamp to human readable
 */
export function formatTimestamp(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatTimestamp(date);
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, startChars: number = 6, endChars: number = 4): string {
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Get color class for threat level
 */
export function getThreatLevelColor(level: string): string {
  const colors: Record<string, string> = {
    'Unknown': 'text-gray-500 bg-gray-100 dark:bg-gray-800',
    'Clean': 'text-green-600 bg-green-100 dark:bg-green-900/30',
    'Suspicious': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    'Malicious': 'text-red-600 bg-red-100 dark:bg-red-900/30',
    'Rehabilitated': 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  };
  return colors[level] || colors['Unknown'];
}

/**
 * Get confidence badge color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  if (confidence >= 75) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
  if (confidence >= 50) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
  return 'text-red-600 bg-red-100 dark:bg-red-900/30';
}

/**
 * Format attack type for display
 */
export function formatAttackType(type: string): string {
  return type.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Validate IP address format
 */
export function isValidIpAddress(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}
