# Network Attack Detector with ML (Node.js)

A dual-layer network attack detection system that combines rule-based detection with XGBoost ML model predictions. This is a Node.js port of the Python version.

## Features

- **Dual-Layer Detection**: Rule-based + ML model predictions
- **Attack Types Detected**:
  - SYN Flood attacks
  - Port scanning
  - ICMP flood attacks
  - UDP flood attacks
  - DDoS patterns
- **Real-time Monitoring**: Live packet capture and analysis
- **ML Integration**: Queries ML API for additional threat analysis
- **Beautiful CLI Output**: Colored terminal output with attack indicators

## Requirements

- **Node.js** v14+ (ES Modules support)
- **Administrator/Root privileges** (required for packet capture)
- **libpcap** (Linux/macOS) or **WinPcap/Npcap** (Windows)
- **Python ML API** running on `http://127.0.0.1:5050` (optional)

## Installation

```bash
# Navigate to the project directory
cd hping-detector-node

# Install dependencies
npm install

# On Linux, you may need to install libpcap development headers first:
# sudo apt-get install libpcap-dev  # Debian/Ubuntu
# sudo yum install libpcap-devel    # CentOS/RHEL
```

## Dependencies

- `cap` - Packet capture library for Node.js
- `chalk` - Terminal string styling
- `axios` - HTTP client for ML API calls

## Usage

### Run with Administrator/Root Privileges

**Linux/macOS:**
```bash
sudo npm start
# or
sudo node index.js
```

**Windows:**
```bash
# Run PowerShell/Command Prompt as Administrator
npm start
# or
node index.js
```

### Testing with hping3

From a separate machine (like Kali Linux), launch attacks:

```bash
# SYN Flood
hping3 -S --flood -p 80 <target_ip>

# ICMP Flood
hping3 -1 --flood <target_ip>

# UDP Flood
hping3 -2 --flood -p 80 <target_ip>

# Port Scan
hping3 -S --scan 1-1000 <target_ip>
```

## Configuration

Edit these constants in `index.js` to adjust detection thresholds:

```javascript
const SYN_FLOOD_THRESHOLD = 50;   // SYN packets per second
const PORT_SCAN_THRESHOLD = 10;   // Different ports per second
const ICMP_FLOOD_THRESHOLD = 30;  // ICMP packets per second
const UDP_FLOOD_THRESHOLD = 50;   // UDP packets per second
```

ML API configuration:
```javascript
const ML_MODEL_API = 'http://127.0.0.1:5050/predict';
let USE_ML_PREDICTIONS = true;  // Set to false to disable ML
```

## ML Model Integration

The detector can integrate with a machine learning model API for enhanced threat detection:

1. Start the Python ML API (from parent directory):
   ```bash
   python app.py
   ```

2. The Node.js detector will automatically detect if the API is available
3. If the API is not running, the detector continues with rule-based detection only

## Output

The detector provides:
- Real-time attack alerts with severity scores
- Attack indicators and statistics
- ML model predictions (when enabled)
- Summary statistics on Ctrl+C

### Malicious Score Legend
- **[0-30%]** - Low threat (Normal traffic)
- **[31-70%]** - Medium threat (Suspicious pattern)
- **[71-100%]** - High threat (Attack detected!)

## Platform-Specific Notes

### Linux
- Requires root privileges: `sudo node index.js`
- Install libpcap: `sudo apt-get install libpcap-dev`

### macOS
- Requires root privileges: `sudo node index.js`
- libpcap usually pre-installed

### Windows
- Run as Administrator
- Install [Npcap](https://npcap.com/) or WinPcap
- During Npcap installation, enable "WinPcap API-compatible Mode"

## Troubleshooting

**Error: Cannot find module 'cap'**
- Run `npm install` to install dependencies
- On Linux, install libpcap-dev: `sudo apt-get install libpcap-dev`

**Error: No network device found**
- Check network interfaces are available
- Ensure proper permissions (run as admin/root)

**ML API not accessible**
- Ensure Python ML API is running on port 5050
- Check firewall settings
- The detector will continue with rule-based detection only

## License

ISC

## Author

Converted from Python to Node.js with ES Modules support
