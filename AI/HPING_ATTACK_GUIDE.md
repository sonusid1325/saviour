# 🚨 hping Attack Detection Guide

## 🎯 What This Does

This detector monitors **network-layer attacks** from tools like hping3, Kali Linux, or any DDoS tool. It detects:

- ✅ **SYN Floods** - TCP SYN packet flooding
- ✅ **Port Scans** - Rapid port scanning attempts  
- ✅ **ICMP Floods** - Ping flooding attacks
- ✅ **UDP Floods** - UDP packet flooding
- ✅ **Real-time malicious scoring** - 0-100% threat level

---

## 🚀 Quick Start

### Step 1: Install Dependencies (if not already done)
```powershell
pip install scapy colorama
```

### Step 2: Start the Detector
**Double-click:** `start_hping_detector.bat`

**OR manually:**
```powershell
# Run PowerShell as Administrator
python hping_attack_detector.py
```

---

## 🧪 Testing with hping from Kali Linux

### Setup
1. **On Windows:** Run `hping_attack_detector.py` (as Administrator)
2. **On Kali:** Find your Windows IP with `ipconfig` → `10.9.6.17`
3. **Launch attacks from Kali** using hping3

### Attack Commands

#### 1️⃣ SYN Flood Attack
```bash
# From Kali terminal
sudo hping3 -S --flood -p 80 10.9.6.17
```
**Expected Detection:**
- Type: `SYN_FLOOD`
- Score: `90-100%` (HIGH THREAT 🚨)
- Indicators: "SYN Flood: 200+ pkts/sec"

#### 2️⃣ ICMP Flood (Ping Flood)
```bash
# From Kali terminal
sudo hping3 -1 --flood 10.9.6.17
```
**Expected Detection:**
- Type: `ICMP_FLOOD`
- Score: `85-100%` (HIGH THREAT 🚨)
- Indicators: "ICMP Flood: 150+ pkts/sec"

#### 3️⃣ UDP Flood
```bash
# From Kali terminal
sudo hping3 -2 --flood -p 53 10.9.6.17
```
**Expected Detection:**
- Type: `UDP_FLOOD`  
- Score: `80-100%` (HIGH THREAT 🚨)
- Indicators: "UDP Flood: 100+ pkts/sec"

#### 4️⃣ Port Scan
```bash
# From Kali terminal
sudo hping3 -S --scan 1-1000 10.9.6.17
```
**Expected Detection:**
- Type: `PORT_SCAN`
- Score: `70-90%` (HIGH THREAT 🚨)
- Indicators: "Port Scan: 50+ ports in 5s"

#### 5️⃣ Slow SYN Scan (Stealth)
```bash
# From Kali terminal
sudo hping3 -S -p 80 -i u100000 10.9.6.17
```
**Expected Detection:**
- Type: Might not trigger (below threshold)
- Score: `20-40%` (LOW-MEDIUM THREAT)

---

## 📺 Example Output

When hping attack is detected:

```
═══════════════════════════════════════════════════════════════════════════════
🚨 ATTACK DETECTED #00142 • 19:53:42
───────────────────────────────────────────────────────────────────────────────

🎯 Attack Classification:
   Type:           SYN FLOOD
   Threat Level:   HIGH THREAT
   Malicious Score: 94.7% █████████████████

🌐 Network Information:
   Source IP:      192.168.1.100 (Kali machine)
   Target IP:      10.9.6.17 (Your Windows PC)
   Source Port:    Random
   Target Port:    80

📊 Attack Statistics:
   Total Packets:  2847
   SYN Packets:    2847
   UDP Packets:    0
   ICMP Packets:   0
   Ports Scanned:  1
   Packets/Sec:    237.3
   Duration:       12.0s

🔍 Attack Indicators:
   • SYN Flood: 237.3 pkts/sec (Threshold: 50)
   • High packet rate from single source
   • Rapid SYN packet generation
   • Potential DoS attack pattern

═══════════════════════════════════════════════════════════════════════════════
```

---

## 🎨 Color Legend

- **🚨 RED (71-100%)** = HIGH THREAT - Active attack detected!
- **⚠️ YELLOW (31-70%)** = MEDIUM THREAT - Suspicious activity
- **✓ GREEN (0-30%)** = LOW THREAT - Normal traffic

---

## ⚙️ Customizing Detection Thresholds

Edit `hping_attack_detector.py` lines 16-19:

```python
# Make detection MORE sensitive (catch smaller attacks)
SYN_FLOOD_THRESHOLD = 20   # Default: 50
PORT_SCAN_THRESHOLD = 5    # Default: 10
ICMP_FLOOD_THRESHOLD = 15  # Default: 30
UDP_FLOOD_THRESHOLD = 20   # Default: 50

# Make detection LESS sensitive (only major attacks)
SYN_FLOOD_THRESHOLD = 100  # Default: 50
PORT_SCAN_THRESHOLD = 20   # Default: 10
ICMP_FLOOD_THRESHOLD = 60  # Default: 30
UDP_FLOOD_THRESHOLD = 100  # Default: 50
```

---

## 📊 Understanding Malicious Scores

### How Scores are Calculated:

**SYN Flood Score:**
```
Score = (SYN packets/second ÷ THRESHOLD) × 100
Example: 150 pkts/sec ÷ 50 threshold = 300% → Capped at 100%
```

**Port Scan Score:**
```
Score = (Unique ports/second ÷ THRESHOLD) × 100
Example: 25 ports/sec ÷ 10 threshold = 250% → Capped at 100%
```

**ICMP/UDP Flood Score:**
```
Score = (ICMP or UDP packets/second ÷ THRESHOLD) × 100
```

### Score Interpretation:
- **90-100%** = Extreme attack (likely hping --flood)
- **71-89%** = Strong attack (rapid manual hping)
- **31-70%** = Moderate attack (slow hping or port scan)
- **0-30%** = Low/normal traffic

---

## 🔥 Advanced Testing Scenarios

### Scenario 1: Distributed Attack Simulation
Launch from **multiple Kali VMs** simultaneously:
```bash
# Kali VM 1
sudo hping3 -S --flood -p 80 10.9.6.17

# Kali VM 2  
sudo hping3 -2 --flood -p 53 10.9.6.17
```
**Result:** Multiple HIGH THREAT alerts from different IPs

### Scenario 2: Randomized Port Scan
```bash
sudo hping3 -S --rand-dest --scan 1-65535 10.9.6.17
```
**Result:** PORT_SCAN with 80-95% score

### Scenario 3: Slowloris-style Attack
```bash
sudo hping3 -S -p 80 -i u500000 --flood 10.9.6.17
```
**Result:** Lower score (40-60%) but still detected

---

## 🆘 Troubleshooting

### "No attacks detected" when running hping
**Causes:**
1. **Wrong target IP** - Use `ipconfig` to verify Windows IP
2. **Firewall blocking** - Disable Windows Firewall temporarily
3. **Network isolation** - Ensure Kali and Windows are on same network
4. **Below threshold** - Attack too slow, increase sensitivity

**Solutions:**
```powershell
# Check if packets are arriving
netstat -s

# Temporarily disable Windows Firewall
netsh advfirewall set allprofiles state off

# Re-enable after testing
netsh advfirewall set allprofiles state on
```

### "Permission denied"
**Solution:** Run PowerShell as Administrator

### "Scapy not found"
**Solution:**
```powershell
pip install scapy
```

---

## 📈 Session Statistics

Press `Ctrl+C` to stop and see full statistics:

```
═══════════════════════════════════════════════════════════════════════════════
📈 SESSION STATISTICS
═══════════════════════════════════════════════════════════════════════════════
   Total Packets:     15,847
   SYN Floods:        12
   Port Scans:        3
   ICMP Floods:       5
   UDP Floods:        2
   Active Attackers:  2
   Session Uptime:    0:05:23
═══════════════════════════════════════════════════════════════════════════════
```

---

## 🎓 Learning Points

By monitoring hping attacks, you understand:
- **Network-layer vs Application-layer** attacks
- **DDoS attack patterns** (SYN floods, UDP amplification)
- **Port scanning techniques** used by penetration testers
- **Traffic rate analysis** and anomaly detection
- **Real-time threat scoring** algorithms

---

## 🔄 Difference from ML-Based Detector

| Feature | hping_attack_detector.py | passive_traffic_monitor.py |
|---------|-------------------------|---------------------------|
| **Layer** | Network (Layer 3/4) | Application (Layer 7) |
| **Detects** | SYN floods, port scans, ICMP/UDP floods | Malicious HTTP requests |
| **Method** | Pattern-based (rate analysis) | ML-based (XGBoost model) |
| **Input** | Raw packets | HTTP request features |
| **Best For** | DDoS, hping, network attacks | Web attacks, API attacks |

**Pro Tip:** Run **both detectors simultaneously** for comprehensive protection!

---

## 🚀 Next Steps

1. ✅ Run detector on Windows
2. ✅ Launch hping from Kali
3. ✅ Watch real-time attack detection
4. ✅ Experiment with different thresholds
5. ✅ Try combining with ML-based HTTP detector

**Happy attack detection!** 🛡️
