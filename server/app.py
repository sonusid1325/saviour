from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import time
from datetime import datetime
from collections import defaultdict
from threading import Lock, Thread
from substrateinterface import SubstrateInterface, Keypair
from substrateinterface.exceptions import SubstrateRequestException
import signal
import sys

app = Flask(__name__, static_folder='public')
CORS(app)
PORT = 8080

# Blockchain connection
blockchain_api = None
signer_account = None
BLOCKCHAIN_WS = os.environ.get('BLOCKCHAIN_WS', 'ws://127.0.0.1:9944')
ip_nfts = {}  # Cache of created IP NFTs
nfts_lock = Lock()
subscription_active = False

# Request logs
request_logs = []
MAX_LOGS = 5000
logs_lock = Lock()

# Stats
stats = {
    'totalRequests': 0,
    'startTime': time.time() * 1000,
    'uniqueIPs': set(),
    'requestsByIP': {},
    'requestsByEndpoint': {},
    'totalBytesReceived': 0,
    'totalBytesSent': 0,
    'nftsCreated': 0,
    'blockchainTransactions': []
}
stats_lock = Lock()

# Flask configuration
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
app.config['JSON_SORT_KEYS'] = False

# Trust proxy
app.config['PREFERRED_URL_SCHEME'] = 'http'

def connect_blockchain():
    """Connect to BlocSaviour blockchain"""
    global blockchain_api, signer_account
    
    try:
        # Custom type registry for BlocSaviour blockchain
        custom_type_registry = {
            "types": {
                "ThreatLevel": {
                    "type": "enum",
                    "type_mapping": [
                        ["Unknown", "Null"],
                        ["Clean", "Null"],
                        ["Suspicious", "Null"],
                        ["Malicious", "Null"],
                        ["Rehabilitated", "Null"]
                    ]
                },
                "AttackType": {
                    "type": "enum",
                    "type_mapping": [
                        ["SynFlood", "Null"],
                        ["UdpFlood", "Null"],
                        ["HttpFlood", "Null"],
                        ["Botnet", "Null"],
                        ["PortScan", "Null"],
                        ["DnsAmplification", "Null"],
                        ["SlowLoris", "Null"],
                        ["IcmpFlood", "Null"],
                        ["Smurf", "Null"],
                        ["Other", "Null"]
                    ]
                },
                "IpTokenData": {
                    "type": "struct",
                    "type_mapping": [
                        ["ip_address", "u32"],
                        ["first_seen", "BlockNumber"],
                        ["token_id", "u64"],
                        ["threat_level", "ThreatLevel"],
                        ["is_malicious", "bool"],
                        ["confidence_score", "u8"],
                        ["attack_types", "Vec<AttackType>"],
                        ["last_updated", "BlockNumber"],
                        ["flagged_count", "u32"],
                        ["false_positive_count", "u32"],
                        ["history", "Vec<HistoryEntry>"]
                    ]
                }
            }
        }
        
        blockchain_api = SubstrateInterface(
            url=BLOCKCHAIN_WS,
            ss58_format=42,
            type_registry=custom_type_registry,
            type_registry_preset='substrate-node-template'
        )
        
        # Initialize keypair with test account (Alice)
        signer_account = Keypair.create_from_uri('//Alice')
        
        print('✅ Connected to BlocSaviour blockchain')
        chain = blockchain_api.rpc_request('system_chain', [])
        header = blockchain_api.get_block_header()
        print(f'   Chain: {chain.get("result", "Unknown")}')
        print(f'   Block: #{header.get("header", {}).get("number", 0)}')
        print(f'   Signer: {signer_account.ss58_address}')
        
        # Sync existing tokens from blockchain
        sync_existing_tokens()
        
        # Subscribe to new blocks
        subscribe_to_blocks()
        
        return True
        
    except Exception as error:
        print('⚠️  Blockchain not available, running without NFT creation')
        print(f'   Error: {str(error)}')
        blockchain_api = None
        return False

def sync_existing_tokens():
    """Sync existing IP tokens from BlocSaviour blockchain"""
    if not blockchain_api:
        return
    
    try:
        print('🔄 Syncing existing IP tokens from blockchain...')
        
        # Query all IP tokens from the IpToken pallet
        result = blockchain_api.query_map(
            module='IpToken',
            storage_function='IpTokens'
        )
        
        synced = 0
        for storage_key, token_data in result:
            try:
                ip_u32 = storage_key[0].value if hasattr(storage_key[0], 'value') else storage_key[0]
                
                # Convert u32 back to IP address
                ip = f"{(ip_u32 >> 24) & 0xFF}.{(ip_u32 >> 16) & 0xFF}.{(ip_u32 >> 8) & 0xFF}.{ip_u32 & 0xFF}"
                
                # Parse token data
                data = token_data.value if hasattr(token_data, 'value') else token_data
                
                threat_level_map = {
                    0: 'unknown', 1: 'clean', 2: 'suspicious', 
                    3: 'malicious', 4: 'rehabilitated'
                }
                
                threat_level_value = data.get('threat_level', 0)
                if isinstance(threat_level_value, dict):
                    threat_level = list(threat_level_value.keys())[0].lower()
                else:
                    threat_level = threat_level_map.get(threat_level_value, 'unknown')
                
                with nfts_lock:
                    ip_nfts[ip] = {
                        'ipAddress': ip,
                        'tokenId': data.get('token_id', ip_u32),
                        'firstSeen': data.get('first_seen', int(time.time() * 1000)),
                        'threatLevel': threat_level,
                        'isMalicious': data.get('is_malicious', False),
                        'confidenceScore': data.get('confidence_score', 0),
                        'attackTypes': [str(at) for at in data.get('attack_types', [])],
                        'lastUpdated': data.get('last_updated', int(time.time() * 1000)),
                        'flaggedCount': data.get('flagged_count', 0),
                        'falsePositiveCount': data.get('false_positive_count', 0),
                        'history': []
                    }
                synced += 1
            except Exception as e:
                print(f'Error parsing token: {e}')
                continue
        
        print(f'✅ Synced {synced} IP tokens from blockchain')
        with stats_lock:
            stats['nftsCreated'] = synced
            
    except Exception as error:
        print(f'Error syncing tokens: {str(error)}')

def subscribe_to_blocks():
    """Subscribe to new blocks in a background thread"""
    global subscription_active
    
    if not blockchain_api:
        return
    
    subscription_active = True
    
    def block_subscription_thread():
        try:
            def subscription_handler(obj, update_nr, subscription_id):
                if not subscription_active:
                    return
                
                try:
                    # Extract block number from the header
                    if isinstance(obj, dict):
                        block_number = obj.get('number', 0)
                        if isinstance(block_number, str):
                            block_number = int(block_number, 16) if block_number.startswith('0x') else int(block_number)
                        
                        print(f"📦 New block: #{block_number}")
                        
                        # Note: We track transactions when they're created, not from blocks
                        # This avoids complex block parsing issues
                        
                except Exception as e:
                    # Silently ignore subscription errors to avoid spam
                    pass
            
            print("🔔 Subscribed to new blocks")
            blockchain_api.subscribe_block_headers(subscription_handler)
            
        except Exception as error:
            print(f'⚠️  Block subscription failed: {error}')
            print("   Continuing without block subscription...")
    
    # Start subscription in background thread
    thread = Thread(target=block_subscription_thread, daemon=True)
    thread.start()

def ip_to_u32(ip_str):
    """Convert IP address to u32"""
    parts = [int(x) for x in ip_str.split('.')]
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]

def analyze_threat_level(ip, user_agent, request_data):
    """Analyze threat level for IP address"""
    is_malicious = False
    threat_level = 'Clean'  # Changed from 'low' to match BlocSaviour ThreatLevel enum
    confidence_score = 50
    attack_types = []
    
    # Check for suspicious patterns
    if user_agent:
        suspicious_agents = ['curl', 'wget', 'python', 'scanner', 'bot', 'scraper']
        if any(agent in user_agent.lower() for agent in suspicious_agents):
            confidence_score += 20
            attack_types.append('Other')  # Automated tool detection
    
    # Check for common attack patterns
    if request_data:
        suspicious_patterns = ['<script', 'SELECT * FROM', '../', 'admin', 'passwd', 'DROP TABLE']
        data_str = str(request_data).lower()
        if any(pattern.lower() in data_str for pattern in suspicious_patterns):
            is_malicious = True
            threat_level = 'Malicious'
            confidence_score += 30
            attack_types.append('HttpFlood')
    
    # Determine threat level based on confidence
    if confidence_score >= 80:
        threat_level = 'Malicious'
        is_malicious = True
    elif confidence_score >= 60:
        threat_level = 'Suspicious'
    elif confidence_score >= 40:
        threat_level = 'Suspicious'
    else:
        threat_level = 'Clean'
    
    return is_malicious, threat_level, confidence_score, attack_types

def create_or_update_nft(ip_address, user_agent, request_data):
    """Create or update NFT for IP address on BlocSaviour blockchain
    
    Note: update_threat_status auto-mints if token doesn't exist, 
    so we only need one transaction!
    """
    global blockchain_api, signer_account
    
    if not blockchain_api or not signer_account:
        return None
    
    try:
        ip_u32 = ip_to_u32(ip_address)
        is_malicious, threat_level, confidence_score, attack_types = analyze_threat_level(
            ip_address, user_agent, request_data
        )
        
        # Check if IP NFT already exists in cache
        with nfts_lock:
            existing_nft = ip_nfts.get(ip_address)
        
        # Convert attack types to proper enum format (use first or 'Other')
        attack_type_enum = attack_types[0] if attack_types else None
        
        try:
            # update_threat_status handles both new and existing tokens (auto-mint)
            call = blockchain_api.compose_call(
                call_module='IpToken',
                call_function='update_threat_status',
                call_params={
                    'ip_address': ip_u32,
                    'threat_level': threat_level,
                    'confidence': confidence_score,
                    'attack_type': attack_type_enum
                }
            )
            
            # Create and submit extrinsic
            extrinsic = blockchain_api.create_signed_extrinsic(
                call=call,
                keypair=signer_account
            )
            
            receipt = blockchain_api.submit_extrinsic(extrinsic, wait_for_inclusion=True)
            
            if receipt.is_success:
                timestamp = int(time.time() * 1000)
                
                with nfts_lock:
                    if ip_address not in ip_nfts:
                        # New token created
                        ip_nfts[ip_address] = {
                            'ipAddress': ip_address,
                            'tokenId': ip_u32,
                            'firstSeen': timestamp,
                            'history': []
                        }
                        with stats_lock:
                            stats['nftsCreated'] += 1
                        print(f"✅ Created NFT for {ip_address}")
                    else:
                        print(f"✅ Updated NFT for {ip_address}")
                    
                    # Update threat metadata
                    ip_nfts[ip_address].update({
                        'threatLevel': threat_level.lower(),
                        'isMalicious': is_malicious,
                        'confidenceScore': confidence_score,
                        'attackTypes': attack_types,
                        'lastUpdated': timestamp
                    })
                
                # Record transaction
                with stats_lock:
                    stats['blockchainTransactions'].append({
                        'hash': receipt.extrinsic_hash if hasattr(receipt, 'extrinsic_hash') else 'unknown',
                        'blockNumber': receipt.block_number if hasattr(receipt, 'block_number') else 0,
                        'method': 'IpToken.update_threat_status',
                        'timestamp': timestamp,
                        'success': True,
                        'from': signer_account.ss58_address
                    })
                    
                    # Keep only last 100 transactions
                    if len(stats['blockchainTransactions']) > 100:
                        stats['blockchainTransactions'].pop(0)
                
                print(f"   → Threat: {threat_level}, Confidence: {confidence_score}%, Attack: {attack_type_enum or 'None'}")
                return ip_nfts[ip_address]
            else:
                print(f"❌ Transaction failed for {ip_address}")
                return None
        
        except Exception as call_error:
            print(f'❌ Error in blockchain call for {ip_address}: {str(call_error)}')
            import traceback
            traceback.print_exc()
            return None
        
    except Exception as error:
        print(f'❌ Error creating/updating NFT for {ip_address}: {str(error)}')
        import traceback
        traceback.print_exc()
    
    return None

def log_request(req, response_size=0):
    """Log incoming request"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    
    user_agent = request.headers.get('User-Agent', 'Unknown')
    
    log_entry = {
        'timestamp': int(time.time() * 1000),
        'ip': ip,
        'method': req.method,
        'path': req.path,
        'userAgent': user_agent,
        'responseSize': response_size,
        'requestSize': req.content_length or 0
    }
    
    with logs_lock:
        request_logs.append(log_entry)
        if len(request_logs) > MAX_LOGS:
            request_logs.pop(0)
    
    with stats_lock:
        stats['totalRequests'] += 1
        stats['uniqueIPs'].add(ip)
        stats['requestsByIP'][ip] = stats['requestsByIP'].get(ip, 0) + 1
        stats['requestsByEndpoint'][req.path] = stats['requestsByEndpoint'].get(req.path, 0) + 1
        stats['totalBytesReceived'] += req.content_length or 0
        stats['totalBytesSent'] += response_size

@app.before_request
def before_request():
    """Before request handler"""
    request.start_time = time.time()

@app.after_request
def after_request(response):
    """After request handler"""
    response_size = response.content_length or len(response.get_data())
    log_request(request, response_size)
    
    # Create/update NFT in background thread (non-blocking)
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    
    user_agent = request.headers.get('User-Agent', 'Unknown')
    request_data = request.get_json(silent=True)
    
    # Fire and forget NFT creation in background thread
    def background_nft_creation():
        try:
            create_or_update_nft(ip, user_agent, request_data)
        except Exception as e:
            print(f'Background NFT creation error: {e}')
    
    thread = Thread(target=background_nft_creation, daemon=True)
    thread.start()
    
    return response

@app.route('/')
def index():
    """Serve index page"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/stats')
def get_stats():
    """Get server statistics"""
    with stats_lock:
        uptime = (time.time() * 1000) - stats['startTime']
        
        return jsonify({
            'totalRequests': stats['totalRequests'],
            'uniqueIPs': len(stats['uniqueIPs']),
            'uptime': uptime,
            'requestsByIP': stats['requestsByIP'],
            'requestsByEndpoint': stats['requestsByEndpoint'],
            'totalBytesReceived': stats['totalBytesReceived'],
            'totalBytesSent': stats['totalBytesSent'],
            'nftsCreated': stats['nftsCreated'],
            'blockchainConnected': blockchain_api is not None
        })

@app.route('/api/nfts')
def get_nfts():
    """Get all NFTs"""
    with nfts_lock:
        nft_list = list(ip_nfts.values())
    
    return jsonify({
        'total': len(nft_list),
        'nfts': nft_list
    })

@app.route('/api/nft/<ip>')
def get_nft_by_ip(ip):
    """Get NFT by IP address"""
    with nfts_lock:
        nft = ip_nfts.get(ip)
    
    if nft:
        return jsonify(nft)
    else:
        return jsonify({'error': 'NFT not found'}), 404

@app.route('/api/transactions')
def get_transactions():
    """Get blockchain transactions"""
    limit = int(request.args.get('limit', 50))
    
    with stats_lock:
        transactions = stats['blockchainTransactions'][-limit:]
    
    return jsonify({
        'total': len(transactions),
        'transactions': list(reversed(transactions))
    })

@app.route('/api/blockchain/status')
def blockchain_status():
    """Get blockchain status"""
    if not blockchain_api:
        return jsonify({'connected': False, 'error': 'Not connected'})
    
    try:
        health = blockchain_api.rpc_request('system_health', [])
        header = blockchain_api.get_block_header()
        
        return jsonify({
            'connected': True,
            'blockNumber': header['header']['number'],
            'blockHash': header['header']['hash'],
            'peers': health['result']['peers'],
            'isSyncing': health['result']['isSyncing'],
            'endpoint': BLOCKCHAIN_WS,
            'signer': signer_account.ss58_address if signer_account else None
        })
    except Exception as error:
        return jsonify({
            'connected': False,
            'error': str(error)
        })

@app.route('/api/logs')
def get_logs():
    """Get request logs"""
    limit = int(request.args.get('limit', 100))
    offset = int(request.args.get('offset', 0))
    ip_filter = request.args.get('ip')
    method_filter = request.args.get('method')
    
    with logs_lock:
        filtered_logs = request_logs.copy()
    
    if ip_filter:
        filtered_logs = [log for log in filtered_logs if log['ip'] == ip_filter]
    
    if method_filter:
        filtered_logs = [log for log in filtered_logs if log['method'] == method_filter]
    
    paginated_logs = list(reversed(filtered_logs))[offset:offset + limit]
    
    return jsonify({
        'total': len(filtered_logs),
        'limit': limit,
        'offset': offset,
        'logs': paginated_logs
    })

@app.route('/api/logs/export')
def export_logs():
    """Export logs to file"""
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    log_file = os.path.join(logs_dir, f'logs-{int(time.time() * 1000)}.json')
    
    with stats_lock, logs_lock:
        export_data = {
            'exportTime': datetime.utcnow().isoformat() + 'Z',
            'stats': {
                'totalRequests': stats['totalRequests'],
                'uniqueIPs': len(stats['uniqueIPs']),
                'uptime': f"{((time.time() * 1000) - stats['startTime']) / 1000:.2f}s"
            },
            'logs': request_logs
        }
    
    with open(log_file, 'w') as f:
        json.dump(export_data, f, indent=2)
    
    return jsonify({
        'message': 'Logs exported successfully',
        'file': log_file,
        'logsCount': len(request_logs)
    })

@app.route('/api/stats/reset', methods=['POST'])
def reset_stats():
    """Reset statistics"""
    global stats, request_logs
    
    with stats_lock:
        old_stats = {
            'totalRequests': stats['totalRequests'],
            'uniqueIPs': len(stats['uniqueIPs'])
        }
        
        stats = {
            'totalRequests': 0,
            'startTime': time.time() * 1000,
            'uniqueIPs': set(),
            'requestsByIP': {},
            'requestsByEndpoint': {},
            'totalBytesReceived': 0,
            'totalBytesSent': 0,
            'nftsCreated': stats['nftsCreated'],
            'blockchainTransactions': []
        }
    
    with logs_lock:
        request_logs.clear()
    
    return jsonify({
        'message': 'Stats reset successfully',
        'previousStats': old_stats
    })

@app.errorhandler(404)
def not_found(error):
    """404 handler"""
    return jsonify({
        'error': 'Not Found',
        'path': request.path
    }), 404

def shutdown_handler(signum, frame):
    """Handle shutdown"""
    global subscription_active
    subscription_active = False
    
    print('\n\n╔════════════════════════════════════════════════╗')
    print('║            Server Shutdown Summary            ║')
    print('╚════════════════════════════════════════════════╝')
    
    with stats_lock:
        print(f'  Total Requests:       {stats["totalRequests"]}')
        print(f'  Unique IPs:           {len(stats["uniqueIPs"])}')
        print(f'  NFTs Created:         {stats["nftsCreated"]}')
        print(f'  Blockchain TXs:       {len(stats["blockchainTransactions"])}')
        print(f'  Uptime:               {((time.time() * 1000) - stats["startTime"]) / 1000:.2f}s')
    print('')
    
    if blockchain_api:
        try:
            blockchain_api.close()
            print('✅ Disconnected from BlocSaviour blockchain\n')
        except:
            pass
    
    sys.exit(0)

if __name__ == '__main__':
    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    
    # Connect to blockchain
    connect_blockchain()
    
    # Get network interfaces
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print('\n╔════════════════════════════════════════════════╗')
    print('║     BlocSaviour Network Monitor Server        ║')
    print('║   🎨 Creating IP NFTs for every request       ║')
    print('╚════════════════════════════════════════════════╝\n')
    
    print(f'Server running on:')
    print(f'  Local:   http://localhost:{PORT}')
    print(f'  Local:   http://127.0.0.1:{PORT}')
    print(f'  Network: http://{local_ip}:{PORT}')
    
    print(f'\nAPI Endpoints:')
    print(f'  Stats:        /api/stats')
    print(f'  Logs:         /api/logs')
    print(f'  NFTs:         /api/nfts')
    print(f'  NFT by IP:    /api/nft/:ip')
    print(f'  Transactions: /api/transactions')
    print(f'\n🔨 Every incoming request creates an IP NFT!\n')
    
    app.run(host='0.0.0.0', port=PORT, debug=False)
