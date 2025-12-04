const http = require('http');
const https = require('https');
const { URL } = require('url');

const keepAliveAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 250,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

const CONFIG = {
  TARGET: 'http://localhost:3000',
  CONCURRENT_WORKERS: 200,
  REQUESTS_PER_WORKER: Infinity,
  DURATION_SECONDS: 60,
  REQUEST_DELAY: 5,
  RANDOM_ENDPOINTS: true,
  RANDOM_METHODS: false,
  PAYLOAD_SIZE: 512,
  TIMEOUT: 10000,
  FOLLOW_REDIRECTS: false,
  AGENT_KEEPALIVE: true
};

const endpoints = ['/', '/test', '/api/stats', '/api/logs'];
const methods = ['GET', 'POST'];
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15'
];

let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  timeouts: 0,
  errors: {},
  bytesSent: 0,
  bytesReceived: 0,
  startTime: Date.now(),
  responseTimes: []
};

let isRunning = true;

function generateRandomPayload(size) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return JSON.stringify({ data: result, timestamp: Date.now() });
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function makeRequest(workerId) {
  if (!isRunning) return;

  const targetURL = new URL(CONFIG.TARGET);
  const endpoint = CONFIG.RANDOM_ENDPOINTS ? getRandomElement(endpoints) : '/';
  const method = CONFIG.RANDOM_METHODS ? getRandomElement(methods) : 'GET';
  const payload = generateRandomPayload(CONFIG.PAYLOAD_SIZE);
  
  const options = {
    hostname: targetURL.hostname,
    port: targetURL.port || (targetURL.protocol === 'https:' ? 443 : 80),
    path: endpoint,
    method: method,
    headers: {
      'User-Agent': getRandomElement(userAgents),
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: CONFIG.TIMEOUT,
    agent: CONFIG.AGENT_KEEPALIVE ? keepAliveAgent : undefined
  };

  stats.totalRequests++;
  const requestStart = Date.now();
  stats.bytesSent += Buffer.byteLength(payload);

  const protocol = targetURL.protocol === 'https:' ? https : http;
  
  const req = protocol.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
      stats.bytesReceived += chunk.length;
    });
    
    res.on('end', () => {
      const responseTime = Date.now() - requestStart;
      stats.responseTimes.push(responseTime);
      
      if (stats.responseTimes.length > 1000) {
        stats.responseTimes.shift();
      }
      
      if (res.statusCode >= 200 && res.statusCode < 400) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
        stats.errors[res.statusCode] = (stats.errors[res.statusCode] || 0) + 1;
      }
      
      if (isRunning) {
        if (CONFIG.REQUEST_DELAY > 0) {
          setTimeout(() => makeRequest(workerId), CONFIG.REQUEST_DELAY);
        } else {
          setImmediate(() => makeRequest(workerId));
        }
      }
    });
    
    res.on('error', (err) => {
      stats.failedRequests++;
      const errorType = err.code || err.message;
      stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
      
      if (isRunning) {
        setTimeout(() => makeRequest(workerId), 50);
      }
    });
  });

  req.on('error', (err) => {
    stats.failedRequests++;
    const errorType = err.code || err.message;
    stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
    
    if (isRunning) {
      setTimeout(() => makeRequest(workerId), 50);
    }
  });

  req.on('timeout', () => {
    stats.timeouts++;
    req.destroy();
    stats.failedRequests++;
    stats.errors['TIMEOUT'] = (stats.errors['TIMEOUT'] || 0) + 1;
    
    if (isRunning) {
      setTimeout(() => makeRequest(workerId), 50);
    }
  });

  if (method !== 'GET' && method !== 'HEAD') {
    req.write(payload);
  }
  
  req.end();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getAverageResponseTime() {
  if (stats.responseTimes.length === 0) return 0;
  const sum = stats.responseTimes.reduce((a, b) => a + b, 0);
  return (sum / stats.responseTimes.length).toFixed(2);
}

function getMedianResponseTime() {
  if (stats.responseTimes.length === 0) return 0;
  const sorted = [...stats.responseTimes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2) : sorted[mid].toFixed(2);
}

console.log(`\n🎯 Target: ${CONFIG.TARGET}`);
console.log(`⚡ Workers: ${CONFIG.CONCURRENT_WORKERS} | Duration: ${CONFIG.DURATION_SECONDS}s`);
console.log('='.repeat(60) + '\n');

for (let i = 0; i < CONFIG.CONCURRENT_WORKERS; i++) {
  setTimeout(() => makeRequest(i), i * 20);
}

const statsInterval = setInterval(() => {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const rps = (stats.successfulRequests / (Date.now() - stats.startTime) * 1000).toFixed(2);
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2);
  
  console.log(`[${elapsed}s] Sent: ${stats.totalRequests} | Success: ${stats.successfulRequests} | Failed: ${stats.failedRequests} | RPS: ${rps} | Success Rate: ${successRate}% | Avg RT: ${getAverageResponseTime()}ms`);
}, 1000);

setTimeout(() => {
  isRunning = false;
  clearInterval(statsInterval);
  
  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const avgRps = (stats.successfulRequests / totalTime).toFixed(2);
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 COMPLETED');
  console.log(`⏱️  Duration: ${totalTime}s | Total: ${stats.totalRequests}`);
  console.log(`✅ Success: ${stats.successfulRequests} (${successRate}%) | ❌ Failed: ${stats.failedRequests}`);
  console.log(`⚡ Avg RPS: ${avgRps} | Avg RT: ${getAverageResponseTime()}ms`);
  console.log(`📊 Traffic: ${formatBytes(stats.bytesSent + stats.bytesReceived)}`);
  
  if (Object.keys(stats.errors).length > 0) {
    console.log('\n🚨 Errors:');
    Object.entries(stats.errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([error, count]) => console.log(`   ${error}: ${count}`));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  setTimeout(() => process.exit(0), 100);
}, CONFIG.DURATION_SECONDS * 1000);

process.on('SIGINT', () => {
  console.log('\n⚠️  Interrupted\n');
  isRunning = false;
  clearInterval(statsInterval);
  setTimeout(() => process.exit(0), 200);
});
