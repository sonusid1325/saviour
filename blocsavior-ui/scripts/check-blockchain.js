#!/usr/bin/env node

/**
 * Script to check if blockchain is running and accessible
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');

async function checkBlockchain() {
  const wsUrl = process.env.BLOCKCHAIN_WS_URL || 'ws://127.0.0.1:9944';
  
  console.log('🔍 Checking blockchain connection...');
  console.log(`   URL: ${wsUrl}\n`);
  
  try {
    const provider = new WsProvider(wsUrl);
    const api = await ApiPromise.create({ provider });
    
    console.log('✅ Connected to blockchain!');
    
    // Get chain info
    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version(),
    ]);
    
    console.log(`   Chain: ${chain}`);
    console.log(`   Node: ${nodeName} v${nodeVersion}`);
    
    // Get latest block
    const latestHeader = await api.rpc.chain.getHeader();
    const blockNumber = latestHeader.number.toNumber();
    console.log(`   Latest Block: #${blockNumber}`);
    
    // Check IP Token pallet
    const totalTokens = await api.query.ipToken.totalTokens();
    const maliciousCount = await api.query.ipToken.maliciousCount();
    
    console.log(`\n📊 Blockchain Stats:`);
    console.log(`   Total IP Tokens: ${totalTokens}`);
    console.log(`   Malicious IPs: ${maliciousCount}`);
    
    // Get all IP tokens
    const entries = await api.query.ipToken.ipTokens.entries();
    console.log(`   Total Entries: ${entries.length}`);
    
    if (entries.length > 0) {
      console.log(`\n📝 Sample IP Token:`);
      const [key, value] = entries[0];
      const data = value.toJSON();
      console.log(JSON.stringify(data, null, 2));
    }
    
    await api.disconnect();
    
    console.log('\n✅ Blockchain is running and accessible!');
    console.log('   You can now use the UI with real blockchain data.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Failed to connect to blockchain!');
    console.error(`   Error: ${error.message}`);
    console.error('\n🔧 Solutions:');
    console.error('   1. Start the blockchain node:');
    console.error('      cd /home/sonu/saviour/bloc-saviour');
    console.error('      cargo build --release');
    console.error('      ./target/release/node-template --dev');
    console.error('');
    console.error('   2. Or check if it\'s running:');
    console.error('      ps aux | grep node-template');
    console.error('');
    console.error('   3. Check the WebSocket URL:');
    console.error('      Default: ws://127.0.0.1:9944');
    console.error('');
    
    process.exit(1);
  }
}

checkBlockchain();
