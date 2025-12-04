const { ApiPromise, WsProvider } = require('@polkadot/api');

async function checkTokens() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('✅ Connected to blockchain');
  console.log(`Chain: ${await api.rpc.system.chain()}\n`);
  
  // Check if ipToken pallet exists
  console.log('📦 Available pallets:');
  const metadata = await api.rpc.state.getMetadata();
  const pallets = metadata.asLatest.pallets.map(p => p.name.toString());
  console.log(pallets.join(', '));
  
  console.log('\n🔍 Checking for ipToken pallet...');
  if (pallets.includes('IpToken') || pallets.includes('ipToken')) {
    console.log('✅ ipToken pallet found!\n');
    
    // Try to get all IP tokens
    console.log('📊 Fetching IP tokens...');
    try {
      const entries = await api.query.ipToken.ipTokens.entries();
      console.log(`Found ${entries.length} IP tokens on-chain\n`);
      
      if (entries.length > 0) {
        entries.forEach(([key, value], idx) => {
          const tokenData = value.toJSON();
          console.log(`Token #${idx + 1}:`);
          console.log(`  Key: ${key.toHuman()}`);
          console.log(`  Data:`, tokenData);
          console.log('');
        });
      } else {
        console.log('⚠️  No tokens found on-chain. The server is only storing them in memory.');
      }
    } catch (error) {
      console.error('❌ Error querying tokens:', error.message);
    }
  } else {
    console.log('❌ ipToken pallet NOT found');
    console.log('⚠️  The blockchain does not have the ipToken pallet');
    console.log('⚠️  NFTs are only being stored in the server memory\n');
  }
  
  await api.disconnect();
}

checkTokens().catch(console.error);
