/**
 * NETWORK ATTACK DETECTOR WITH ML - Dual-Layer Detection System
 * Combines Rule-Based Detection + XGBoost ML Model Predictions
 * Monitors for: SYN floods, UDP floods, ICMP floods, Port scans, DDoS patterns
 * 
 * Requirements:
 * - Run as Administrator (for packet capture)
 * - npm install cap chalk axios
 * - ML API must be running: python app.py
 */

import capModule from 'cap';
import chalk from 'chalk';
import axios from 'axios';
import { execSync } from 'child_process';

const Cap = capModule.Cap;
const decoders = capModule.decoders;
const PROTOCOL = capModule.decoders.PROTOCOL;

// ===== ATTACK DETECTION THRESHOLDS =====
const SYN_FLOOD_THRESHOLD = 50;   // SYN packets per second from same IP
const PORT_SCAN_THRESHOLD = 10;   // Different ports accessed per second
const ICMP_FLOOD_THRESHOLD = 30;  // ICMP packets per second
const UDP_FLOOD_THRESHOLD = 50;   // UDP packets per second

// ===== ML MODEL CONFIGURATION =====
const ML_MODEL_API = 'http://127.0.0.1:5050/predict';
let USE_ML_PREDICTIONS = true;

// ===== TRACKING DICTIONARIES =====
const ipStats = new Map();

// ===== STATISTICS =====
const stats = {
    totalPackets: 0,
    synFloods: 0,
    portScans: 0,
    icmpFloods: 0,
    udpFloods: 0,
    mlPredictions: 0,
    mlBlocked: 0,
    mlApiErrors: 0,
    startTime: new Date()
};

/**
 * Clear terminal screen
 */
function clearScreen() {
    console.clear();
}

/**
 * Get country from IP - simplified for local testing
 */
async function getClientCountry(ip) {
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.')) {
        return 'US';  // Default for local IPs
    }
    
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 2000 });
        if (response.status === 200) {
            return response.data.countryCode || 'US';
        }
    } catch (error) {
        // Silently fail
    }
    
    return 'US';  // Default fallback
}

/**
 * Query ML model and return prediction
 */
async function queryMLModel(requestData) {
    if (!USE_ML_PREDICTIONS) {
        return null;
    }
    
    try {
        const response = await axios.post(ML_MODEL_API, requestData, { timeout: 5000 });
        if (response.status === 200) {
            stats.mlPredictions++;
            return response.data;
        }
        return null;
    } catch (error) {
        stats.mlApiErrors++;
        return null;
    }
}

/**
 * Print beautiful banner
 */
function printBanner() {
    const mlStatus = USE_ML_PREDICTIONS ? chalk.green('ENABLED') : chalk.yellow('DISABLED');
    const banner = `
${chalk.red('='.repeat(79))}
                                                                             
        ${chalk.yellow('⚠️  NETWORK ATTACK DETECTOR - Dual-Layer Detection')}          
                                                                             
     ${chalk.cyan('Rule-Based Detection + XGBoost ML Model Predictions')}     
     ${chalk.cyan('Monitors: SYN Floods | Port Scans | ICMP/UDP Floods | DDoS')}            
                                                                             
${chalk.red('='.repeat(79))}

${chalk.white('Detection Capabilities:')}
   🎯 SYN Flood Detection    - Threshold: ${SYN_FLOOD_THRESHOLD} pkts/sec
   🎯 Port Scan Detection    - Threshold: ${PORT_SCAN_THRESHOLD} ports/sec
   🎯 ICMP Flood Detection   - Threshold: ${ICMP_FLOOD_THRESHOLD} pkts/sec
   🎯 UDP Flood Detection    - Threshold: ${UDP_FLOOD_THRESHOLD} pkts/sec
   🤖 ML Model Predictions   - Status: ${mlStatus}

${chalk.white('Malicious Score Legend:')}
   ${chalk.green('[0-30%]')}   = Low threat (Normal traffic)
   ${chalk.yellow('[31-70%]')}  = Medium threat (Suspicious pattern)
   ${chalk.red('[71-100%]')} = High threat (Attack detected!)

${chalk.white('Controls:')}
   Press ${chalk.cyan('Ctrl+C')} to stop monitoring and view final statistics
${chalk.red('='.repeat(79))}
`;
    console.log(banner);
}

/**
 * Calculate malicious score based on attack patterns
 */
function calculateMaliciousScore(ipData, attackType) {
    let score = 0;
    const timeWindow = (new Date() - ipData.firstSeen) / 1000 || 1;
    
    if (attackType === 'SYN_FLOOD') {
        const synRate = ipData.synCount / timeWindow;
        score = Math.min(100, (synRate / SYN_FLOOD_THRESHOLD) * 70);
    } else if (attackType === 'PORT_SCAN') {
        const portsPerSec = ipData.portsAccessed.size / timeWindow;
        score = Math.min(100, (portsPerSec / PORT_SCAN_THRESHOLD) * 80);
    } else if (attackType === 'ICMP_FLOOD') {
        const icmpRate = ipData.icmpCount / timeWindow;
        score = Math.min(100, (icmpRate / ICMP_FLOOD_THRESHOLD) * 75);
    } else if (attackType === 'UDP_FLOOD') {
        const udpRate = ipData.udpCount / timeWindow;
        score = Math.min(100, (udpRate / UDP_FLOOD_THRESHOLD) * 75);
    }
    
    if (ipData.totalPackets > 1000) score += 10;
    if (ipData.portsAccessed.size > 50) score += 15;
    
    return Math.min(100, Math.round(score));
}

/**
 * Get score color based on percentage
 */
function getScoreColor(score) {
    if (score <= 30) return chalk.green;
    if (score <= 70) return chalk.yellow;
    return chalk.red;
}

/**
 * Print attack detection with beautiful formatting
 */
function printAttackDetection(srcIp, dstIp, attackType, score, ipData, packetInfo, mlResult) {
    const scoreColor = getScoreColor(score);
    const attackTypeFormatted = attackType.replace('_', ' ');
    
    console.log(`\n${chalk.red('=')} ${chalk.bgRed.white.bold(' ATTACK DETECTED ')} ${chalk.red('='.repeat(60))}`);
    console.log(`${chalk.white('Attack Type:')}    ${chalk.red.bold(attackTypeFormatted)}`);
    console.log(`${chalk.white('Source IP:')}      ${chalk.cyan(srcIp)}`);
    console.log(`${chalk.white('Target IP:')}      ${chalk.cyan(dstIp)}`);
    console.log(`${chalk.white('Malicious Score:')} ${scoreColor(score + '%')} ${scoreColor('█'.repeat(Math.floor(score / 5)))}`);
    
    if (packetInfo.srcPort) {
        console.log(`${chalk.white('Source Port:')}    ${packetInfo.srcPort}`);
    }
    if (packetInfo.dstPort) {
        console.log(`${chalk.white('Dest Port:')}      ${packetInfo.dstPort}`);
    }
    
    console.log(`\n${chalk.white('Attack Indicators:')}`);
    ipData.flags.forEach(flag => {
        console.log(`   ${chalk.yellow('⚠️')}  ${flag}`);
    });
    
    if (mlResult) {
        console.log(`\n${chalk.white('ML Model Analysis:')}`);
        console.log(`   ${chalk.cyan('Predicted Action:')} ${chalk.bold(mlResult.predicted_action)}`);
        console.log(`   ${chalk.cyan('Confidence:')} ${mlResult.malicious_probability}%`);
        console.log(`   ${chalk.cyan('Decision:')} ${mlResult.decision}`);
    }
    
    console.log(`\n${chalk.white('IP Statistics:')}`);
    console.log(`   Total Packets: ${ipData.totalPackets} | SYN: ${ipData.synCount} | UDP: ${ipData.udpCount} | ICMP: ${ipData.icmpCount}`);
    console.log(`   Ports Accessed: ${ipData.portsAccessed.size} | Time Window: ${((new Date() - ipData.firstSeen) / 1000).toFixed(2)}s`);
    
    console.log(chalk.red('='.repeat(79)));
}

/**
 * Print statistics summary
 */
function printStatistics() {
    const uptime = ((new Date() - stats.startTime) / 1000 / 60).toFixed(2);
    
    console.log(`\n${chalk.cyan('=')} ${chalk.bgCyan.black.bold(' DETECTION STATISTICS ')} ${chalk.cyan('='.repeat(54))}`);
    console.log(`${chalk.white('Monitoring Time:')}  ${uptime} minutes`);
    console.log(`${chalk.white('Total Packets:')}    ${stats.totalPackets}`);
    console.log(`${chalk.white('Unique IPs:')}       ${ipStats.size}`);
    console.log(`\n${chalk.yellow('Attacks Detected:')}`);
    console.log(`   SYN Floods:    ${stats.synFloods}`);
    console.log(`   Port Scans:    ${stats.portScans}`);
    console.log(`   ICMP Floods:   ${stats.icmpFloods}`);
    console.log(`   UDP Floods:    ${stats.udpFloods}`);
    console.log(`   ${chalk.bold('Total Attacks:')} ${stats.synFloods + stats.portScans + stats.icmpFloods + stats.udpFloods}`);
    
    if (USE_ML_PREDICTIONS) {
        console.log(`\n${chalk.cyan('ML Model Stats:')}`);
        console.log(`   Predictions Made: ${stats.mlPredictions}`);
        console.log(`   Blocked by ML:    ${stats.mlBlocked}`);
        console.log(`   API Errors:       ${stats.mlApiErrors}`);
    }
    
    console.log(chalk.cyan('='.repeat(79)));
}

/**
 * Get or create IP stats
 */
function getIpStats(ip) {
    if (!ipStats.has(ip)) {
        ipStats.set(ip, {
            synCount: 0,
            udpCount: 0,
            icmpCount: 0,
            portsAccessed: new Set(),
            totalPackets: 0,
            firstSeen: new Date(),
            lastSeen: new Date(),
            flags: []
        });
    }
    return ipStats.get(ip);
}

/**
 * Analyze packet for attack patterns
 */
async function analyzePacket(buffer, protocol, srcIp, dstIp) {
    stats.totalPackets++;
    
    // Debug output every 50 packets
    if (stats.totalPackets % 50 === 0) {
        console.log(chalk.gray(`[DEBUG] Analyzed ${stats.totalPackets} packets, ${ipStats.size} unique IPs`));
    }
    
    const ipData = getIpStats(srcIp);
    ipData.totalPackets++;
    ipData.lastSeen = new Date();
    ipData.flags = [];
    
    let attackDetected = false;
    let attackType = '';
    const packetInfo = { srcPort: null, dstPort: null };
    
    const timeWindow = (new Date() - ipData.firstSeen) / 1000 || 1;
    
    // Detect SYN Flood & Port Scan
    if (protocol === PROTOCOL.IP.TCP) {
        try {
            const ret = decoders.TCP(buffer);
            if (ret && ret.info) {
                packetInfo.srcPort = ret.info.srcport;
                packetInfo.dstPort = ret.info.dstport;
                
                if (ret.info.flags && ret.info.flags.syn && !ret.info.flags.ack) {
                    ipData.synCount++;
                    ipData.portsAccessed.add(ret.info.dstport);
                    
                    const synRate = ipData.synCount / timeWindow;
                    const portsPerSec = ipData.portsAccessed.size / timeWindow;
                    
                    if (synRate > SYN_FLOOD_THRESHOLD) {
                        attackDetected = true;
                        attackType = 'SYN_FLOOD';
                        stats.synFloods++;
                        ipData.flags.push(`SYN Flood: ${synRate.toFixed(1)} pkts/sec (Threshold: ${SYN_FLOOD_THRESHOLD})`);
                    }
                    
                    if (portsPerSec > PORT_SCAN_THRESHOLD) {
                        attackDetected = true;
                        attackType = 'PORT_SCAN';
                        stats.portScans++;
                        ipData.flags.push(`Port Scan: ${ipData.portsAccessed.size} ports in ${timeWindow.toFixed(1)}s (Threshold: ${PORT_SCAN_THRESHOLD}/sec)`);
                    }
                }
            }
        } catch (error) {
            // Silently continue
        }
    }
    
    // Detect ICMP Flood
    if (protocol === PROTOCOL.IP.ICMP) {
        ipData.icmpCount++;
        const icmpRate = ipData.icmpCount / timeWindow;
        
        if (icmpRate > ICMP_FLOOD_THRESHOLD) {
            attackDetected = true;
            attackType = 'ICMP_FLOOD';
            stats.icmpFloods++;
            ipData.flags.push(`ICMP Flood: ${icmpRate.toFixed(1)} pkts/sec (Threshold: ${ICMP_FLOOD_THRESHOLD})`);
        }
    }
    
    // Detect UDP Flood
    if (protocol === PROTOCOL.IP.UDP) {
        try {
            const ret = decoders.UDP(buffer);
            if (ret && ret.info) {
                packetInfo.srcPort = ret.info.srcport;
                packetInfo.dstPort = ret.info.dstport;
            }
        } catch (error) {
            // Silently continue
        }
        
        ipData.udpCount++;
        const udpRate = ipData.udpCount / timeWindow;
        
        if (udpRate > UDP_FLOOD_THRESHOLD) {
            attackDetected = true;
            attackType = 'UDP_FLOOD';
            stats.udpFloods++;
            ipData.flags.push(`UDP Flood: ${udpRate.toFixed(1)} pkts/sec (Threshold: ${UDP_FLOOD_THRESHOLD})`);
        }
    }
    
    // Print attack if detected
    if (attackDetected) {
        const score = calculateMaliciousScore(ipData, attackType);
        
        let mlResult = null;
        if (USE_ML_PREDICTIONS) {
            try {
                const country = await getClientCountry(srcIp);
                const currentTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
                
                const mlRequestData = {
                    IP: srcIp,
                    Endpoint: `/attack/${attackType.toLowerCase()}`,
                    'User-Agent': 'Network-Attack-Tool',
                    Country: country,
                    Date: currentTime
                };
                
                mlResult = await queryMLModel(mlRequestData);
                
                if (mlResult && ['BLOCK', 'JSCHALLENGE'].includes(mlResult.predicted_action)) {
                    stats.mlBlocked++;
                }
            } catch (error) {
                // Silently fail
            }
        }
        
        printAttackDetection(srcIp, dstIp, attackType, score, ipData, packetInfo, mlResult);
        
        const totalAttacks = stats.synFloods + stats.portScans + stats.icmpFloods + stats.udpFloods;
        if (totalAttacks % 20 === 0) {
            printStatistics();
        }
    }
}

/**
 * Get default network interface
 */
function getDefaultInterface() {
    const devices = Cap.deviceList();
    
    // Try to find the first non-loopback interface with an address
    for (const device of devices) {
        if (device.addresses && device.addresses.length > 0) {
            for (const addr of device.addresses) {
                if (addr.addr && !addr.addr.startsWith('127.')) {
                    return device.name;
                }
            }
        }
    }
    
    // Fallback to first device
    return devices.length > 0 ? devices[0].name : null;
}

/**
 * Main entry point
 */
async function main() {
    // Check if running as admin/root
    try {
        if (process.platform === 'win32') {
            // Windows admin check would require additional module
            console.log(chalk.yellow('[!] WARNING: Make sure you run this as Administrator on Windows\n'));
        } else if (process.getuid && process.getuid() !== 0) {
            console.log(chalk.red('[X] ERROR: This script requires root privileges!'));
            console.log(chalk.yellow('    Please run with sudo\n'));
            return;
        }
    } catch (error) {
        console.log(chalk.yellow('[!] WARNING: Could not verify admin privileges\n'));
    }
    
    clearScreen();
    printBanner();
    
    // Check if ML Model API is accessible
    if (USE_ML_PREDICTIONS) {
        try {
            await axios.get('http://127.0.0.1:5050/', { timeout: 3000 });
            console.log(chalk.green('[✓] ML Model API is accessible'));
        } catch (error) {
            console.log(chalk.yellow('[!] WARNING: ML Model API is not running!'));
            console.log(chalk.yellow('    ML predictions will be disabled. Start app.py for ML features.'));
            console.log(chalk.yellow('    Continuing with rule-based detection only...\n'));
            USE_ML_PREDICTIONS = false;
        }
    }
    
    const c = new Cap();
    const device = getDefaultInterface();
    
    if (!device) {
        console.log(chalk.red('[X] ERROR: No network device found!'));
        return;
    }
    
    const filter = 'ip';
    const bufSize = 10 * 1024 * 1024;
    const buffer = Buffer.alloc(65535);
    
    const linkType = c.open(device, filter, bufSize, buffer);
    
    console.log(chalk.green(`[MONITORING] Capturing packets on device: ${device}`));
    console.log(chalk.yellow('[INFO] Launch hping from Kali - Attacks will be detected below\n'));
    console.log(chalk.cyan('Example hping commands:'));
    console.log(`  ${chalk.white('SYN Flood:')}   ${chalk.cyan('hping3 -S --flood -p 80 <target_ip>')}`);
    console.log(`  ${chalk.white('ICMP Flood:')}  ${chalk.cyan('hping3 -1 --flood <target_ip>')}`);
    console.log(`  ${chalk.white('UDP Flood:')}   ${chalk.cyan('hping3 -2 --flood -p 80 <target_ip>')}`);
    console.log(`  ${chalk.white('Port Scan:')}   ${chalk.cyan('hping3 -S --scan 1-1000 <target_ip>')}\n`);
    
    let packetCount = 0;
    c.on('packet', function(nbytes, trunc) {
        packetCount++;
        if (packetCount % 100 === 0) {
            console.log(chalk.gray(`[DEBUG] Captured ${packetCount} packets...`));
        }
        
        if (linkType === 'ETHERNET') {
            const ret = decoders.Ethernet(buffer);
            
            if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
                const retIp = decoders.IPV4(buffer, ret.offset);
                const srcIp = retIp.info.srcaddr;
                const dstIp = retIp.info.dstaddr;
                const protocol = retIp.info.protocol;
                
                // Run async analysis without blocking packet capture
                analyzePacket(buffer.slice(retIp.offset), protocol, srcIp, dstIp).catch(err => {
                    console.error(chalk.red('[ERROR]'), err.message);
                });
            }
        }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log(`\n\n${chalk.yellow('[STOP] Stopping Attack Detector...')}\n`);
        printStatistics();
        console.log(`\n${chalk.green('[OK] Detection session ended')}\n`);
        c.close();
        process.exit(0);
    });
}

// Start the detector
main().catch(error => {
    console.error(chalk.red('[X] Error:'), error.message);
    process.exit(1);
});
