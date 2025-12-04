const http = require('http');

const CONFIG = {
  TARGET: 'http://localhost:3000',
  CONCURRENT_WORKERS: 100,
  DURATION_SECONDS: 60,
  REQUEST_DELAY: 10
};

const endpoints = ['/', '/test', '/api/stats'];

let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  errors: {},
  startTime: Date.now()
};

let isRunning = true;

function makeRequest(workerId) {
  if (!isRunning) return;

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  stats.totalRequests++;
  
  const req = http.get(`${CONFIG.TARGET}${endpoint}`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
        stats.errors[res.statusCode] = (stats.errors[res.statusCode] || 0) + 1;
      }
      
      if (isRunning) {
        setTimeout(() => makeRequest(workerId), CONFIG.REQUEST_DELAY);
      }
    });
  });

  req.on('error', (err) => {
    stats.failedRequests++;
    const errorType = err.code || 'ERROR';
    stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
    
    if (isRunning) {
      setTimeout(() => makeRequest(workerId), CONFIG.REQUEST_DELAY);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    stats.failedRequests++;
    stats.errors['TIMEOUT'] = (stats.errors['TIMEOUT'] || 0) + 1;
    
    if (isRunning) {
      setTimeout(() => makeRequest(workerId), CONFIG.REQUEST_DELAY);
    }
  });
  
  req.setTimeout(5000);
}

console.log(`\nTarget: ${CONFIG.TARGET}`);
console.log(`Workers: ${CONFIG.CONCURRENT_WORKERS} | Duration: ${CONFIG.DURATION_SECONDS}s`);
console.log('='.repeat(60) + '\n');

for (let i = 0; i < CONFIG.CONCURRENT_WORKERS; i++) {
  setTimeout(() => makeRequest(i), i * 50);
}

const statsInterval = setInterval(() => {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const rps = (stats.successfulRequests / (Date.now() - stats.startTime) * 1000).toFixed(2);
  const successRate = stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) : '0.00';
  
  console.log(`[${elapsed}s] Total: ${stats.totalRequests} | Success: ${stats.successfulRequests} | Failed: ${stats.failedRequests} | RPS: ${rps} | Rate: ${successRate}%`);
}, 1000);

setTimeout(() => {
  isRunning = false;
  clearInterval(statsInterval);
  
  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const avgRps = (stats.successfulRequests / totalTime).toFixed(2);
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('\nATTACK COMPLETED');
  console.log(`Duration: ${totalTime}s | Total: ${stats.totalRequests}`);
  console.log(`Success: ${stats.successfulRequests} (${successRate}%) | Failed: ${stats.failedRequests}`);
  console.log(`Average RPS: ${avgRps}`);
  
  if (Object.keys(stats.errors).length > 0) {
    console.log('\nError Breakdown:');
    Object.entries(stats.errors)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => console.log(`  ${error}: ${count}`));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  setTimeout(() => process.exit(0), 100);
}, CONFIG.DURATION_SECONDS * 1000);

process.on('SIGINT', () => {
  console.log('\n\nAttack interrupted\n');
  isRunning = false;
  clearInterval(statsInterval);
  setTimeout(() => process.exit(0), 200);
});
