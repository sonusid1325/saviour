#!/bin/bash

# Mint a test IP token using curl and JSON-RPC
IP="192.168.1.100"

# Convert IP to u32
IFS='.' read -r -a octets <<< "$IP"
IP_U32=$(( (${octets[0]} << 24) + (${octets[1]} << 16) + (${octets[2]} << 8) + ${octets[3]} ))

echo "Minting IP: $IP (u32: $IP_U32)"

# Use polkadot-js-api to mint
node << 'SCRIPT'
const { ApiPromise, HttpProvider, Keyring } = require('@polkadot/api');

(async () => {
  // Use HTTP provider instead of WebSocket
  const provider = new HttpProvider('http://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  
  // IP 192.168.1.100 = 3232235876
  const ipU32 = 3232235876;
  
  console.log('Creating transaction...');
  
  // The function only takes IP address - it creates with default values
  const tx = api.tx.ipToken.mintIpToken(ipU32);
  
  const hash = await tx.signAndSend(alice);
  console.log('✅ Transaction sent! Hash:', hash.toHex());
  
  // Wait a bit for block inclusion
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  console.log('✅ IP Token should now be minted!');
  process.exit(0);
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
SCRIPT
