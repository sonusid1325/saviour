const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const axios = require('axios');

const THREATS_API = process.env.THREATS_API || 'http://10.9.3.147:5050/threats';
const BLOCKCHAIN_WS = process.env.BLOCKCHAIN_WS || 'ws://127.0.0.1:9944';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000; // 10 seconds

let blockchainAPI = null;
let signerAccount = null;
const processedThreats = new Set();
const ipNFTs = new Map(); // Cache of created IP NFTs

let stats = {
  totalThreatsProcessed: 0,
  nftsCreated: 0,
  nftsUpdated: 0,
  blockchainTransactions: [],
  startTime: Date.now()
};

async function connectBlockchain() {
  try {
    const provider = new WsProvider(BLOCKCHAIN_WS);
    blockchainAPI = await ApiPromise.create({ provider });
    await blockchainAPI.isReady;
    
    const keyring = new Keyring({ type: 'sr25519' });
    signerAccount = keyring.addFromUri('//Alice');
    
    console.log('✅ Connected to BlocSaviour blockchain');
    const chain = await blockchainAPI.rpc.system.chain();
    const header = await blockchainAPI.rpc.chain.getHeader();
    console.log(`   Chain: ${chain}`);
    console.log(`   Block: #${header.number.toNumber()}`);
    console.log(`   Signer: ${signerAccount.address}`);
    
    await syncExistingTokens();
  } catch (error) {
    console.warn('⚠️  Blockchain not available, running without NFT creation');
    console.warn('   Error:', error.message);
    blockchainAPI = null;
  }
}

async function syncExistingTokens() {
  if (!blockchainAPI) return;
  
  try {
    console.log('🔄 Syncing existing IP tokens from blockchain...');
    const entries = await blockchainAPI.query.ipToken.ipTokens.entries();
    
    let synced = 0;
    for (const [key, value] of entries) {
      const ipU32 = key.args[0].toNumber();
      const data = value.toJSON();
      
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
        lastUpdated: data.lastUpdated || Date.now()
      });
      synced++;
    }
    
    console.log(`✅ Synced ${synced} IP tokens from blockchain`);
    stats.nftsCreated = synced;
  } catch (error) {
    console.error('Error syncing tokens:', error.message);
  }
}

function ipToU32(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

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

function mapAttackTypeToEnum(attackType) {
  const mapping = {
    'UDP FLOOD': 'UdpFlood',
    'UDP_FLOOD': 'UdpFlood',
    'SYN FLOOD': 'SynFlood',
    'SYN_FLOOD': 'SynFlood',
    'ICMP FLOOD': 'IcmpFlood',
    'ICMP_FLOOD': 'IcmpFlood',
    'HTTP FLOOD': 'HttpFlood',
    'HTTP_FLOOD': 'HttpFlood',
    'DDOS': 'HttpFlood',
    'DNS_AMP': 'DnsAmplification',
    'SLOWLORIS': 'SlowLoris',
    'SMURF': 'Smurf',
    'BOT': 'Botnet',
    'BOTNET': 'Botnet',
    'SCAN': 'PortScan',
    'PORT_SCAN': 'PortScan'
  };
  return mapping[attackType.toUpperCase()] || 'Other';
}

async function createIPToken(threatData) {
  if (!blockchainAPI || !signerAccount) {
    console.log('⚠️  Blockchain not connected, skipping token creation');
    return null;
  }

  try {
    const { target_ip, attack_type, threat_level, ml_action, timestamp } = threatData;
    const tokenId = `IP_${target_ip.replace(/\./g, '_')}_${Date.now()}`;
    
    // Prepare metadata
    const metadata = {
      ip: target_ip,
      attack_type: attack_type,
      threat_level: threat_level,
      ml_action: ml_action,
      timestamp: timestamp,
      detected_at: new Date().toISOString(),
      token_id: tokenId
    };

    console.log(`\n🎨 Creating IP Token: ${tokenId}`);
    console.log(`   IP: ${target_ip}`);
    console.log(`   Attack: ${attack_type}`);
    console.log(`   Level: ${threat_level}`);
    console.log(`   Action: ${ml_action}`);

    // Create transaction with metadata
    const tx = blockchainAPI.tx.system.remark(JSON.stringify({
      type: 'IP_TOKEN_CREATION',
      tokenId: tokenId,
      metadata: metadata
    }));

    const hash = await tx.signAndSend(signerAccount);
    
    console.log(`✅ Token created - TX Hash: ${hash.toHex()}`);
    
    return {
      tokenId,
      txHash: hash.toHex(),
      metadata,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to create IP token:', error.message);
    return null;
  }
}

async function updateTransactionMetadata(tokenId, updates) {
  if (!blockchainAPI || !signerAccount) {
    console.log('⚠️  Blockchain not connected, skipping metadata update');
    return null;
  }

  try {
    console.log(`📝 Updating metadata for ${tokenId}`);
    
    const tx = blockchainAPI.tx.system.remark(JSON.stringify({
      type: 'IP_TOKEN_UPDATE',
      tokenId: tokenId,
      updates: updates,
      updatedAt: new Date().toISOString()
    }));

    const hash = await tx.signAndSend(signerAccount);
    
    console.log(`✅ Metadata updated - TX Hash: ${hash.toHex()}`);
    
    return hash.toHex();
  } catch (error) {
    console.error('❌ Failed to update metadata:', error.message);
    return null;
  }
}

async function fetchAndProcessThreats() {
  try {
    console.log(`\n🔍 Fetching threats from ${THREATS_API}...`);
    
    const response = await axios.get(THREATS_API, { timeout: 5000 });
    const { threats } = response.data;

    if (!threats || threats.length === 0) {
      console.log('   No threats detected');
      return;
    }

    console.log(`   Found ${threats.length} threat(s)`);

    for (const threat of threats) {
      const threatKey = `${threat.target_ip}_${threat.timestamp}`;
      
      // Skip if already processed
      if (processedThreats.has(threatKey)) {
        continue;
      }

      // Create IP token
      const result = await createIPToken(threat);
      
      if (result) {
        // Mark as processed
        processedThreats.add(threatKey);
        
        // Update with additional metadata (example)
        await updateTransactionMetadata(result.tokenId, {
          status: 'processed',
          action_taken: threat.ml_action,
          processed_at: new Date().toISOString()
        });
      }

      // Small delay between processing
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to threats API - is it running?');
    } else {
      console.error('❌ Error fetching threats:', error.message);
    }
  }
}

async function cleanupOldProcessed() {
  // Keep only last 1000 processed threats to prevent memory leak
  if (processedThreats.size > 1000) {
    const toRemove = processedThreats.size - 1000;
    const iterator = processedThreats.values();
    for (let i = 0; i < toRemove; i++) {
      processedThreats.delete(iterator.next().value);
    }
    console.log(`🧹 Cleaned ${toRemove} old processed threats from memory`);
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     BlocSaviour Threat Sync Service            ║');
  console.log('║   🔄 Syncing threats from analysis server      ║');
  console.log('║   🎨 Creating IP tokens on blockchain          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Connect to blockchain
  await connectBlockchain();

  console.log(`\n📡 Starting threat sync...`);
  console.log(`   API: ${THREATS_API}`);
  console.log(`   Poll Interval: ${POLL_INTERVAL}ms\n`);

  // Start polling
  setInterval(async () => {
    await fetchAndProcessThreats();
    await cleanupOldProcessed();
  }, POLL_INTERVAL);

  // Initial fetch
  await fetchAndProcessThreats();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║         Threat Sync Service Shutdown          ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`  Processed Threats: ${processedThreats.size}`);
  
  if (blockchainAPI) {
    await blockchainAPI.disconnect();
    console.log('✅ Disconnected from blockchain\n');
  }
  
  process.exit(0);
});

// Start the service
main().catch(console.error);
