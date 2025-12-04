const { ApiPromise, WsProvider } = require('@polkadot/api');

async function checkPallet() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('🔍 Checking IpToken pallet methods:\n');
  
  const calls = api.tx.ipToken;
  Object.keys(calls).forEach(method => {
    if (typeof calls[method] === 'function') {
      console.log(`  ${method}()`);
      console.log(`    Meta:`, calls[method].meta.toHuman());
      console.log('');
    }
  });
  
  await api.disconnect();
}

checkPallet().catch(console.error);
