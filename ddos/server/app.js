const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const axios = require('axios');

const app = express();
const PORT = 8080;

// Blockchain connection
let blockchainAPI = null;
let signerAccount = null;
const BLOCKCHAIN_WS = process.env.BLOCKCHAIN_WS || 'ws://127.0.0.1:9944';
const ipNFTs = new Map(); // Cache of created IP NFTs

// ML API
const THREATS_API = process.env.THREATS_API || 'http://10.9.3.147:5050/threats';
const threatCache = new Map(); // Cache API responses

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.set('trust proxy', true);
app.disable('x-powered-by');

const requestLogs = [];
const MAX_LOGS = 5000;

let stats = {
  totalRequests: 0,
  startTime: Date.now(),
  uniqueIPs: new Set(),
  requestsByIP: {},
  requestsByEndpoint: {},
  totalBytesReceived: 0,
  totalBytesSent: 0,
  nftsCreated: 0,
  blockchainTransactions: [],
  apiCalls: 0,
  apiErrors: 0
};

// Fetch threat analysis from API
let isPolling = false;
async function pollThreatsAPI() {
  if (isPolling) return;
  isPolling = true;

  try {
    const response = await axios.get(THREATS_API, { timeout: 2000 });
    const { threats } = response.data;

    if (!threats || !Array.isArray(threats)) {
      isPolling = false;
      return;
    }

    // console.log(`🔍 Polled ${threats.length} threats from API`);

    for (const threat of threats) {
      const threatInfo = {
        threatLevel: threat.threat_level || 'unknown',
        isMalicious: threat.ml_action === 'BLOCK',
        confidence: 90, // Default high confidence for API
        attackTypes: [threat.attack_type || 'UNKNOWN'],
        mlAction: threat.ml_action,
        mlPrediction: threat.ml_prediction,
        source: 'api'
      };

      // Create or update NFT based on API data
      await createIpNFT(threat.target_ip, threatInfo);
    }
  } catch (error) {
    stats.apiErrors++;
    if (error.code !== 'ECONNREFUSED') {
      console.error('API polling error:', error.message);
    }
  } finally {
    isPolling = false;
  }
}

// Start polling every second
setInterval(pollThreatsAPI, 1000);

// Connect to blockchain
async function connectBlockchain() {
  try {
    const provider = new WsProvider(BLOCKCHAIN_WS);
    blockchainAPI = await ApiPromise.create({ provider });
    await blockchainAPI.isReady;

    // Initialize keyring with test account
    const keyring = new Keyring({ type: 'sr25519' });
    signerAccount = keyring.addFromUri('//Alice'); // Use Alice for testing

    console.log('✅ Connected to BlocSaviour blockchain');
    const chain = await blockchainAPI.rpc.system.chain();
    const header = await blockchainAPI.rpc.chain.getHeader();
    console.log(`   Chain: ${chain}`);
    console.log(`   Block: #${header.number.toNumber()}`);
    console.log(`   Signer: ${signerAccount.address}`);

    // Sync existing tokens from blockchain
    await syncExistingTokens();

    // Subscribe to new blocks for real-time updates
    subscribeToBlocks();
  } catch (error) {
    console.warn('⚠️  Blockchain not available, running without NFT creation');
    console.warn('   Error:', error.message);
    blockchainAPI = null;
  }
}

// Sync existing IP tokens from blockchain
async function syncExistingTokens() {
  if (!blockchainAPI) return;

  try {
    console.log('🔄 Syncing existing IP tokens from blockchain...');
    const entries = await blockchainAPI.query.ipToken.ipTokens.entries();

    let synced = 0;
    for (const [key, value] of entries) {
      const ipU32 = key.args[0].toNumber();
      const data = value.toJSON();

      // Convert u32 back to IP
      const ip = [
        (ipU32 >>> 24) & 0xFF,
        (ipU32 >>> 16) & 0xFF,
        (ipU32 >>> 8) & 0xFF,
        ipU32 & 0xFF
      ].join('.');

      ipNFTs.set(ip, {
        ipAddress: ip,
        tokenId: ipU32,
        firstSeen: data.firstSeen || Date.now(),
        threatLevel: data.threatLevel?.toLowerCase() || 'unknown',
        isMalicious: data.isMalicious || false,
        confidenceScore: data.confidenceScore || 0,
        attackTypes: data.attackTypes || [],
        lastUpdated: data.lastUpdated || Date.now(),
        flaggedCount: data.flaggedCount || 0,
        falsePositiveCount: data.falsePositiveCount || 0,
        history: []
      });
      synced++;
    }

    console.log(`✅ Synced ${synced} IP tokens from blockchain`);
    stats.nftsCreated = synced;
  } catch (error) {
    console.error('Error syncing tokens:', error.message);
  }
}

// Subscribe to new blocks and track transactions
function subscribeToBlocks() {
  if (!blockchainAPI) return;

  blockchainAPI.rpc.chain.subscribeNewHeads(async (header) => {
    const blockNumber = header.number.toNumber();

    // Get block details
    const blockHash = await blockchainAPI.rpc.chain.getBlockHash(blockNumber);
    const signedBlock = await blockchainAPI.rpc.chain.getBlock(blockHash);
    const allRecords = await blockchainAPI.query.system.events.at(blockHash);

    // Process extrinsics
    signedBlock.block.extrinsics.forEach((extrinsic, index) => {
      const { method: { method, section } } = extrinsic;

      if (section === 'ipToken') {
        const extrinsicEvents = allRecords.filter(({ phase }) =>
          phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
        );

        const success = extrinsicEvents.some(({ event }) =>
          blockchainAPI.events.system.ExtrinsicSuccess.is(event)
        );

        stats.blockchainTransactions.push({
          hash: extrinsic.hash.toHex(),
          blockNumber: blockNumber,
          method: `${section}.${method}`,
          timestamp: Date.now(),
          success: success,
          from: extrinsic.signer.toString()
        });

        // Keep only last 100 transactions
        if (stats.blockchainTransactions.length > 100) {
          stats.blockchainTransactions.shift();
        }
      }
    });
  });
}

// Convert IP to u32
function ipToU32(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

// Map threat level to blockchain enum
function mapThreatLevelToEnum(threatLevel) {
  const mapping = {
    'unknown': 'Unknown',
    'clean': 'Clean',
    'suspicious': 'Suspicious',
    'malicious': 'Malicious',
    'rehabilitated': 'Rehabilitated'
  };
  return mapping[threatLevel.toLowerCase()] || 'Unknown';
}

// Map attack type to blockchain enum
function mapAttackTypeToEnum(attackType) {
  const mapping = {
    'DDOS': 'HttpFlood',
    'HIGH_RATE': 'HttpFlood',
    'BOT': 'Botnet',
    'SQL_INJECTION': 'Other',
    'XSS': 'Other',
    'PATH_TRAVERSAL': 'Other',
    'SCAN': 'PortScan',
    'ADMIN_PROBE': 'PortScan',
    'SYN_FLOOD': 'SynFlood',
    'UDP_FLOOD': 'UdpFlood',
    'ICMP_FLOOD': 'IcmpFlood',
    'DNS_AMP': 'DnsAmplification',
    'SLOWLORIS': 'SlowLoris',
    'SMURF': 'Smurf'
  };
  return mapping[attackType] || 'Other';
}

// Create IP NFT on blockchain
async function createIpNFT(ip, threatInfo) {
  if (!ip || ip === 'unknown') {
    return null;
  }

  // Clean IPv6-mapped IPv4 and IPv6 localhost
  let cleanIP = ip.replace('::ffff:', '');
  if (cleanIP === '::1') {
    cleanIP = '127.0.0.1'; // Convert IPv6 localhost to IPv4
  }

  // Check if already created
  if (ipNFTs.has(cleanIP)) {
    const existing = ipNFTs.get(cleanIP);

    // Update threat level if it has changed and blockchain is available
    if (threatInfo.isMalicious && existing.threatLevel !== threatInfo.threatLevel) {
      existing.threatLevel = threatInfo.threatLevel;
      existing.isMalicious = threatInfo.isMalicious;
      existing.confidenceScore = threatInfo.confidence;
      existing.attackTypes = [...new Set([...existing.attackTypes, ...threatInfo.attackTypes])];
      existing.flaggedCount = (existing.flaggedCount || 0) + 1;
      existing.lastUpdated = Date.now();
      existing.mlPrediction = threatInfo.mlPrediction || existing.mlPrediction;

      // Add to history
      if (!existing.history) existing.history = [];
      existing.history.push({
        timestamp: Date.now(),
        blockNumber: stats.totalRequests,
        oldStatus: existing.threatLevel,
        newStatus: threatInfo.threatLevel,
        confidence: threatInfo.confidence,
        mlPrediction: threatInfo.mlPrediction || null
      });

      // Update on blockchain
      if (blockchainAPI && signerAccount) {
        try {
          const threatLevelEnum = mapThreatLevelToEnum(threatInfo.threatLevel);
          const attackTypeEnum = threatInfo.attackTypes.length > 0 ?
            mapAttackTypeToEnum(threatInfo.attackTypes[0]) : null;
          const confidenceU8 = Math.min(100, Math.max(0, threatInfo.confidence));

          const updateTx = blockchainAPI.tx.ipToken.updateThreatStatus(
            existing.tokenId,
            threatLevelEnum,
            confidenceU8,
            attackTypeEnum
          );

          updateTx.signAndSend(signerAccount, ({ status }) => {
            if (status.isInBlock) {
              console.log(`🔄 Updated ${cleanIP} → ${threatInfo.threatLevel} (Block: ${status.asInBlock.toHex().substring(0, 16)}...)`);
            }
          });
        } catch (error) {
          console.error(`Failed to update ${cleanIP} on blockchain:`, error.message);
        }
      }

      console.log(`⚠️  IP ${cleanIP} escalated to ${threatInfo.threatLevel}`);
    } else if (threatInfo.mlPrediction) {
      // Update ML prediction even if threat level hasn't changed
      existing.mlPrediction = threatInfo.mlPrediction;
    }

    return existing;
  }

  const tokenId = ipToU32(cleanIP);
  if (!tokenId) return null;

  let txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
  const blockNumber = stats.totalRequests;
  const timestamp = Date.now();

  // Actually create IP token on blockchain with threat intelligence
  if (blockchainAPI && signerAccount) {
    try {
      // Determine if we need to mint or update
      const existsOnChain = await blockchainAPI.query.ipToken.ipTokens(tokenId);

      if (existsOnChain.isEmpty) {
        // Mint new token
        const mintTx = blockchainAPI.tx.ipToken.mintIpToken(tokenId);
        await new Promise((resolve, reject) => {
          mintTx.signAndSend(signerAccount, ({ status, events }) => {
            if (status.isInBlock) {
              txHash = status.asInBlock.toHex();
              console.log(`🔨 NFT Minted: ${cleanIP} → Token #${tokenId} (Block: ${txHash.substring(0, 16)}...)`);
              resolve();
            } else if (status.isFinalized) {
              console.log(`   ✓ Finalized in block ${status.asFinalized.toHex().substring(0, 16)}...`);
            }
          }).catch(reject);
        });
      }

      // Update threat status if malicious
      if (threatInfo.isMalicious) {
        const threatLevel = mapThreatLevelToEnum(threatInfo.threatLevel);
        const attackType = threatInfo.attackTypes.length > 0
          ? mapAttackTypeToEnum(threatInfo.attackTypes[0])
          : null;

        const updateTx = blockchainAPI.tx.ipToken.updateThreatStatus(
          tokenId,
          threatLevel,
          Math.round(threatInfo.confidence),
          attackType
        );

        await new Promise((resolve, reject) => {
          updateTx.signAndSend(signerAccount, ({ status }) => {
            if (status.isInBlock) {
              console.log(`⚠️  Threat Updated: ${cleanIP} → ${threatLevel} (${threatInfo.confidence}% confidence)`);
              if (attackType) console.log(`   Attack Type: ${attackType}`);
              resolve();
            }
          }).catch(reject);
        });
      }

    } catch (error) {
      console.error(`❌ Blockchain TX failed for ${cleanIP}:`, error.message);
    }
  }

  const nft = {
    ipAddress: cleanIP,
    tokenId,
    txHash,
    blockNumber,
    timestamp,
    isMalicious: threatInfo.isMalicious,
    threatLevel: threatInfo.threatLevel,
    confidenceScore: threatInfo.confidence,
    attackTypes: threatInfo.attackTypes,
    mlPrediction: threatInfo.mlPrediction || null,
    firstSeen: timestamp,
    lastUpdated: timestamp,
    flaggedCount: threatInfo.isMalicious ? 1 : 0,
    falsePositiveCount: 0,
    requestCount: 1,
    history: [
      {
        timestamp,
        blockNumber,
        oldStatus: 'unknown',
        newStatus: threatInfo.threatLevel,
        confidence: threatInfo.confidence,
        mlPrediction: threatInfo.mlPrediction || null
      }
    ]
  };

  ipNFTs.set(cleanIP, nft);
  stats.nftsCreated++;
  stats.blockchainTransactions.push({
    hash: txHash,
    type: 'mint_ip_token',
    ipAddress: cleanIP,
    tokenId,
    threatLevel: threatInfo.threatLevel,
    attackTypes: threatInfo.attackTypes,
    timestamp,
    status: 'success'
  });

  // Keep only last 100 transactions
  if (stats.blockchainTransactions.length > 100) {
    stats.blockchainTransactions.shift();
  }

  const threatEmoji = threatInfo.threatLevel === 'malicious' ? '🚨' :
    threatInfo.threatLevel === 'suspicious' ? '⚠️' : '✅';
  console.log(`${threatEmoji} NFT Created: ${cleanIP} → Token #${tokenId} | ${threatInfo.threatLevel.toUpperCase()} (${threatInfo.confidence}%)`);
  console.log(`   TX: ${txHash.substring(0, 16)}... | Attacks: ${threatInfo.attackTypes.join(', ')}`);

  return nft;
}



function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown';
}

function calculateRequestSize(req) {
  let size = 0;
  size += Buffer.byteLength(req.method + ' ' + req.url + ' HTTP/1.1\r\n');
  Object.keys(req.headers).forEach(key => {
    size += Buffer.byteLength(key + ': ' + req.headers[key] + '\r\n');
  });
  size += 2;
  if (req.body) {
    size += Buffer.byteLength(JSON.stringify(req.body));
  }
  return size;
}

app.use(async (req, res, next) => {
  const startTime = Date.now();
  const ip = getClientIP(req);
  const requestSize = calculateRequestSize(req);

  stats.totalRequests++;
  stats.uniqueIPs.add(ip);
  stats.totalBytesReceived += requestSize;

  // Track IP stats for ML
  if (!stats.requestsByIP[ip]) {
    stats.requestsByIP[ip] = { count: 0, endpoints: new Set(), lastRequest: Date.now() };
  }
  stats.requestsByIP[ip].count++;
  stats.requestsByIP[ip].endpoints.add(req.path);
  stats.requestsByIP[ip].lastRequest = Date.now();

  stats.requestsByEndpoint[req.path] = (stats.requestsByEndpoint[req.path] || 0) + 1;

  // NOTE: We no longer do per-request threat analysis.
  // The server polls the threat API separately.

  const nft = ipNFTs.get(ip);
  if (nft) {
    req.ipNFT = nft; // Attach NFT info to request if it exists
    nft.requestCount = (nft.requestCount || 0) + 1;
  }

  const originalSend = res.send;
  res.send = function (data) {
    const responseSize = Buffer.byteLength(data || '');
    stats.totalBytesSent += responseSize;

    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: ip,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'] || 'unknown',
      requestSize: requestSize,
      responseSize: responseSize,
      responseTime: Date.now() - startTime,
      statusCode: res.statusCode,
      headers: req.headers,
      threatSource: nft ? 'blockchain/api' : 'none',
      nft: req.ipNFT ? {
        tokenId: req.ipNFT.tokenId,
        txHash: req.ipNFT.txHash,
        threatLevel: req.ipNFT.threatLevel,
        isMalicious: req.ipNFT.isMalicious,
        attackTypes: req.ipNFT.attackTypes,
        confidence: req.ipNFT.confidenceScore
      } : null
    };

    requestLogs.push(logEntry);
    if (requestLogs.length > MAX_LOGS) {
      requestLogs.shift();
    }

    const nftInfo = req.ipNFT ? `[NFT #${req.ipNFT.tokenId} | ${req.ipNFT.threatLevel.toUpperCase()}]` : '';
    console.log(`[${logEntry.timestamp}] ${ip} ${nftInfo} - ${req.method} ${req.path} - ${res.statusCode} - ${logEntry.responseTime}ms`);

    return originalSend.call(this, data);
  };

  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'running' });
});

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

app.post('/test', (req, res) => {
  res.json({ ok: true, data: req.body });
});

app.get('/api/stats', (req, res) => {
  const uptime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const rps = (stats.totalRequests / (Date.now() - stats.startTime) * 1000).toFixed(2);

  const topIPs = Object.entries(stats.requestsByIP)
    .sort((a, b) => {
      const aCount = typeof b[1] === 'object' ? b[1].count : b[1];
      const bCount = typeof a[1] === 'object' ? a[1].count : a[1];
      return aCount - bCount;
    })
    .slice(0, 10)
    .map(([ip, data]) => {
      const count = typeof data === 'object' ? data.count : data;
      return {
        ip,
        requests: count,
        nft: ipNFTs.get(ip) ? {
          tokenId: ipNFTs.get(ip).tokenId,
          threatLevel: ipNFTs.get(ip).threatLevel
        } : null
      };
    });

  const topEndpoints = Object.entries(stats.requestsByEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, requests: count }));

  res.json({
    uptime: `${uptime}s`,
    totalRequests: stats.totalRequests,
    uniqueIPs: stats.uniqueIPs.size,
    requestsPerSecond: rps,
    totalBytesReceived: stats.totalBytesReceived,
    totalBytesSent: stats.totalBytesSent,
    totalDataTransfer: `${((stats.totalBytesReceived + stats.totalBytesSent) / 1024 / 1024).toFixed(2)} MB`,
    nftsCreated: stats.nftsCreated,
    apiCalls: stats.apiCalls,
    apiErrors: stats.apiErrors,
    threatAPIConnected: stats.apiErrors === 0 || stats.apiCalls > stats.apiErrors,
    recentTransactions: stats.blockchainTransactions.slice(-10),
    topIPs: topIPs,
    topEndpoints: topEndpoints,
    recentRequestsCount: requestLogs.length,
    blockchainConnected: blockchainAPI !== null
  });
});

// Get all IP NFTs
app.get('/api/nfts', async (req, res) => {
  // Fetch live data from blockchain if connected
  if (blockchainAPI) {
    try {
      const entries = await blockchainAPI.query.ipToken.ipTokens.entries();
      const tokens = [];

      for (const [key, value] of entries) {
        const ipU32 = key.args[0].toNumber();
        const data = value.toJSON();

        const ip = [
          (ipU32 >>> 24) & 0xFF,
          (ipU32 >>> 16) & 0xFF,
          (ipU32 >>> 8) & 0xFF,
          ipU32 & 0xFF
        ].join('.');

        tokens.push({
          ipAddress: ip,
          tokenId: ipU32,
          firstSeen: data.firstSeen || Date.now(),
          threatLevel: data.threatLevel?.toLowerCase() || 'unknown',
          isMalicious: data.isMalicious || false,
          confidenceScore: data.confidenceScore || 0,
          attackTypes: data.attackTypes || [],
          lastUpdated: data.lastUpdated || Date.now(),
          flaggedCount: data.flaggedCount || 0,
          falsePositiveCount: data.falsePositiveCount || 0,
          requestCount: stats.requestsByIP[ip] || 0,
          history: []
        });
      }

      return res.json({
        total: tokens.length,
        nfts: tokens,
        source: 'blockchain'
      });
    } catch (error) {
      console.error('Error fetching from blockchain:', error.message);
    }
  }

  // Fallback to cache
  const nfts = Array.from(ipNFTs.values()).map(nft => ({
    ipAddress: nft.ipAddress,
    tokenId: nft.tokenId,
    txHash: nft.txHash,
    threatLevel: nft.threatLevel,
    isMalicious: nft.isMalicious,
    confidenceScore: nft.confidenceScore,
    attackTypes: nft.attackTypes || [],
    firstSeen: nft.firstSeen,
    lastUpdated: nft.lastUpdated,
    requestCount: nft.requestCount || (typeof stats.requestsByIP[nft.ipAddress] === 'object' ? stats.requestsByIP[nft.ipAddress].count : stats.requestsByIP[nft.ipAddress]) || 0,
    flaggedCount: nft.flaggedCount || 0,
    falsePositiveCount: nft.falsePositiveCount || 0,
    mlPrediction: nft.mlPrediction || null,
    history: nft.history || []
  }));

  res.json({
    total: nfts.length,
    malicious: nfts.filter(n => n.isMalicious).length,
    clean: nfts.filter(n => !n.isMalicious).length,
    nfts: nfts.sort((a, b) => b.firstSeen - a.firstSeen),
    source: 'cache',
    mlEnabled: mlModel !== null
  });
});

// Get NFT by IP
app.get('/api/nft/:ip', async (req, res) => {
  const ip = req.params.ip;

  // Try blockchain first
  if (blockchainAPI) {
    try {
      const ipU32 = ipToU32(ip);
      if (ipU32) {
        const result = await blockchainAPI.query.ipToken.ipTokens(ipU32);
        if (!result.isEmpty) {
          const data = result.toJSON();
          return res.json({
            ipAddress: ip,
            tokenId: ipU32,
            firstSeen: data.firstSeen || Date.now(),
            threatLevel: data.threatLevel?.toLowerCase() || 'unknown',
            isMalicious: data.isMalicious || false,
            confidenceScore: data.confidenceScore || 0,
            attackTypes: data.attackTypes || [],
            lastUpdated: data.lastUpdated || Date.now(),
            flaggedCount: data.flaggedCount || 0,
            falsePositiveCount: data.falsePositiveCount || 0,
            requestCount: stats.requestsByIP[ip] || 0,
            lastSeen: requestLogs.filter(log => log.ip === ip).pop()?.timestamp || data.firstSeen,
            history: [],
            source: 'blockchain'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching from blockchain:', error.message);
    }
  }

  // Fallback to cache
  const nft = ipNFTs.get(ip);

  if (!nft) {
    return res.status(404).json({ error: 'NFT not found for this IP' });
  }

  const requestCount = typeof stats.requestsByIP[ip] === 'object'
    ? stats.requestsByIP[ip].count
    : stats.requestsByIP[ip] || 0;

  res.json({
    ...nft,
    requestCount,
    lastSeen: requestLogs.filter(log => log.ip === ip).pop()?.timestamp || nft.firstSeen,
    source: 'cache',
    mlEnabled: mlModel !== null
  });
});

// Get blockchain transactions
app.get('/api/transactions', async (req, res) => {
  // Fetch real transactions from blockchain
  if (blockchainAPI) {
    try {
      const header = await blockchainAPI.rpc.chain.getHeader();
      const currentBlock = header.number.toNumber();
      const transactions = [];

      // Scan last 20 blocks
      const blocksToScan = Math.min(20, currentBlock);

      for (let i = 0; i < blocksToScan; i++) {
        const blockNumber = currentBlock - i;
        const blockHash = await blockchainAPI.rpc.chain.getBlockHash(blockNumber);
        const signedBlock = await blockchainAPI.rpc.chain.getBlock(blockHash);
        const allRecords = await blockchainAPI.query.system.events.at(blockHash);

        signedBlock.block.extrinsics.forEach((extrinsic, index) => {
          const { method: { method, section } } = extrinsic;

          if (section === 'ipToken') {
            const extrinsicEvents = allRecords.filter(({ phase }) =>
              phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
            );

            const success = extrinsicEvents.some(({ event }) =>
              blockchainAPI.events.system.ExtrinsicSuccess.is(event)
            );

            transactions.push({
              hash: extrinsic.hash.toHex(),
              blockNumber: blockNumber,
              method: `${section}.${method}`,
              timestamp: Date.now() - (i * 6000),
              success: success,
              from: extrinsic.signer.toString()
            });
          }
        });
      }

      return res.json({
        total: transactions.length,
        transactions: transactions,
        source: 'blockchain'
      });
    } catch (error) {
      console.error('Error fetching transactions:', error.message);
    }
  }

  // Fallback to cached transactions
  res.json({
    total: stats.blockchainTransactions.length,
    transactions: stats.blockchainTransactions.slice().reverse(),
    source: 'cache'
  });
});

// Get blockchain status
app.get('/api/blockchain/status', async (req, res) => {
  if (!blockchainAPI) {
    return res.json({
      connected: false,
      error: 'Blockchain not connected'
    });
  }

  try {
    const [chain, header, health] = await Promise.all([
      blockchainAPI.rpc.system.chain(),
      blockchainAPI.rpc.chain.getHeader(),
      blockchainAPI.rpc.system.health()
    ]);

    res.json({
      connected: true,
      chain: chain.toString(),
      blockNumber: header.number.toNumber(),
      blockHash: header.hash.toHex(),
      peers: health.peers.toNumber(),
      isSyncing: health.isSyncing.isTrue,
      endpoint: BLOCKCHAIN_WS,
      signer: signerAccount ? signerAccount.address : null
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error.message
    });
  }
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const ip = req.query.ip;
  const method = req.query.method;

  let filteredLogs = [...requestLogs];

  if (ip) {
    filteredLogs = filteredLogs.filter(log => log.ip === ip);
  }

  if (method) {
    filteredLogs = filteredLogs.filter(log => log.method === method);
  }

  const paginatedLogs = filteredLogs
    .reverse()
    .slice(offset, offset + limit);

  res.json({
    total: filteredLogs.length,
    limit: limit,
    offset: offset,
    logs: paginatedLogs
  });
});

app.get('/api/logs/export', (req, res) => {
  const logFile = path.join(__dirname, '../logs', `logs-${Date.now()}.json`);

  const exportData = {
    exportTime: new Date().toISOString(),
    stats: {
      totalRequests: stats.totalRequests,
      uniqueIPs: stats.uniqueIPs.size,
      uptime: ((Date.now() - stats.startTime) / 1000).toFixed(2) + 's'
    },
    logs: requestLogs
  };

  fs.writeFileSync(logFile, JSON.stringify(exportData, null, 2));

  res.json({
    message: 'Logs exported successfully',
    file: logFile,
    logsCount: requestLogs.length
  });
});

app.post('/api/stats/reset', (req, res) => {
  const oldStats = {
    totalRequests: stats.totalRequests,
    uniqueIPs: stats.uniqueIPs.size
  };

  stats = {
    totalRequests: 0,
    startTime: Date.now(),
    uniqueIPs: new Set(),
    requestsByIP: {},
    requestsByEndpoint: {},
    totalBytesReceived: 0,
    totalBytesSent: 0
  };

  requestLogs.length = 0;

  res.json({
    message: 'Stats reset successfully',
    previousStats: oldStats
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Initialize blockchain
connectBlockchain().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = require('os').networkInterfaces();
    const addresses = [];

    Object.keys(networkInterfaces).forEach((interfaceName) => {
      networkInterfaces[interfaceName].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      });
    });

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║     BlocSaviour Network Monitor Server        ║');
    console.log('║   🎨 Creating IP NFTs for every request       ║');
    console.log('║   🔗 API-Powered Threat Detection             ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`Server running on:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Local:   http://127.0.0.1:${PORT}`);

    if (addresses.length > 0) {
      addresses.forEach(addr => {
        console.log(`  Network: http://${addr}:${PORT}`);
      });
    }

    console.log(`\nAPI Endpoints:`);
    console.log(`  Stats:        /api/stats`);
    console.log(`  Logs:         /api/logs`);
    console.log(`  NFTs:         /api/nfts`);
    console.log(`  NFT by IP:    /api/nft/:ip`);
    console.log(`  Transactions: /api/transactions`);
    console.log(`\n🔨 Every incoming request creates an IP NFT!`);
    console.log(`🔗 Threat API: ${THREATS_API}\n`);
  });
});

process.on('SIGINT', async () => {
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║            Server Shutdown Summary            ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`  Total Requests:       ${stats.totalRequests}`);
  console.log(`  Unique IPs:           ${stats.uniqueIPs.size}`);
  console.log(`  NFTs Created:         ${stats.nftsCreated}`);
  console.log(`  Blockchain TXs:       ${stats.blockchainTransactions.length}`);
  console.log(`  Uptime:               ${((Date.now() - stats.startTime) / 1000).toFixed(2)}s`);
  console.log('');

  if (blockchainAPI) {
    await blockchainAPI.disconnect();
    console.log('✅ Disconnected from blockchain\n');
  }

  process.exit(0);
});
