#!/usr/bin/env python3
"""
Test script for BlocSaviour Python Server
Tests basic functionality and blockchain connectivity
"""

import requests
import json
import time

SERVER_URL = "http://localhost:8080"

def test_server_status():
    """Test if server is running"""
    try:
        response = requests.get(f"{SERVER_URL}/api/stats")
        if response.status_code == 200:
            print("✅ Server is running")
            print(f"   Stats: {response.json()}")
            return True
        else:
            print(f"❌ Server returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running or not accessible")
        return False

def test_blockchain_status():
    """Test blockchain connection"""
    try:
        response = requests.get(f"{SERVER_URL}/api/blockchain/status")
        if response.status_code == 200:
            data = response.json()
            if data.get('connected'):
                print("✅ Blockchain is connected")
                print(f"   Block: #{data.get('blockNumber')}")
                print(f"   Signer: {data.get('signer')}")
                return True
            else:
                print(f"⚠️  Blockchain not connected: {data.get('error')}")
                return False
        else:
            print(f"❌ Failed to get blockchain status")
            return False
    except Exception as e:
        print(f"❌ Error checking blockchain: {e}")
        return False

def test_nft_creation():
    """Test NFT creation by making a request"""
    try:
        # Make a test request to trigger NFT creation
        response = requests.get(f"{SERVER_URL}/api/stats")
        time.sleep(2)  # Wait for NFT creation
        
        # Get NFT list
        response = requests.get(f"{SERVER_URL}/api/nfts")
        if response.status_code == 200:
            data = response.json()
            total = data.get('total', 0)
            print(f"✅ NFTs found: {total}")
            if total > 0:
                print(f"   Sample NFT: {data['nfts'][0]}")
            return True
        else:
            print("❌ Failed to get NFTs")
            return False
    except Exception as e:
        print(f"❌ Error testing NFT creation: {e}")
        return False

def test_transactions():
    """Test transaction history"""
    try:
        response = requests.get(f"{SERVER_URL}/api/transactions")
        if response.status_code == 200:
            data = response.json()
            total = data.get('total', 0)
            print(f"✅ Blockchain transactions: {total}")
            if total > 0:
                print(f"   Latest: {data['transactions'][0]['method']}")
            return True
        else:
            print("❌ Failed to get transactions")
            return False
    except Exception as e:
        print(f"❌ Error testing transactions: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("BlocSaviour Python Server Tests")
    print("=" * 50)
    print()
    
    tests = [
        ("Server Status", test_server_status),
        ("Blockchain Connection", test_blockchain_status),
        ("NFT Creation", test_nft_creation),
        ("Transactions", test_transactions)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\nTesting: {name}")
        print("-" * 50)
        result = test_func()
        results.append(result)
        print()
    
    print("=" * 50)
    print("Test Summary")
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    return passed == total

if __name__ == "__main__":
    exit(0 if main() else 1)
