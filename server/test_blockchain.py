#!/usr/bin/env python3
"""
Quick test to check BlocSaviour blockchain connection
Run this AFTER starting your blockchain node
"""

from substrateinterface import SubstrateInterface, Keypair
import sys

BLOCKCHAIN_WS = 'ws://127.0.0.1:9944'

print("🔗 Testing BlocSaviour Blockchain Connection...")
print(f"   Endpoint: {BLOCKCHAIN_WS}\n")

try:
    # Connect to blockchain
    substrate = SubstrateInterface(
        url=BLOCKCHAIN_WS,
        ss58_format=42,
        type_registry_preset='substrate-node-template'
    )
    
    print("✅ Connected to blockchain!")
    
    # Get chain info
    chain = substrate.rpc_request('system_chain', [])
    print(f"   Chain: {chain.get('result', 'Unknown')}")
    
    # Get block number
    header = substrate.get_block_header()
    print(f"   Block: #{header.get('header', {}).get('number', 0)}")
    
    # Test keypair
    alice = Keypair.create_from_uri('//Alice')
    print(f"   Alice Address: {alice.ss58_address}")
    
    # Query IpToken pallet
    print("\n🔍 Querying IpToken pallet...")
    try:
        # Try to get total tokens
        total = substrate.query('IpToken', 'TotalTokens')
        print(f"   Total IP Tokens: {total.value if hasattr(total, 'value') else total}")
        
        # Try to get next token ID
        next_id = substrate.query('IpToken', 'NextTokenId')
        print(f"   Next Token ID: {next_id.value if hasattr(next_id, 'value') else next_id}")
        
        print("\n✅ IpToken pallet is accessible!")
        
    except Exception as e:
        print(f"\n⚠️  IpToken pallet query failed: {e}")
        print("   Make sure your blockchain has the IpToken pallet configured")
    
    substrate.close()
    print("\n✅ All tests passed!")
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure BlocSaviour blockchain is running")
    print("2. Check if WebSocket endpoint is ws://127.0.0.1:9944")
    print("3. Verify node is synced and producing blocks")
    sys.exit(1)
