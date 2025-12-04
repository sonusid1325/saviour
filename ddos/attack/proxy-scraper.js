#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan.bold('\n='.repeat(60)));
console.log(chalk.cyan.bold('         PROXY SCRAPER - Fetching Free Proxies'));
console.log(chalk.cyan.bold('='.repeat(60) + '\n'));

let allProxies = new Set();

async function scrapeProxyList1() {
    try {
        console.log(chalk.yellow('Fetching from Free Proxy List...'));
        const response = await axios.get('https://free-proxy-list.net/', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        let count = 0;
        
        $('table.table tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 7) {
                const ip = $(cols[0]).text().trim();
                const port = $(cols[1]).text().trim();
                const https = $(cols[6]).text().trim();
                
                if (ip && port) {
                    const proxy = https === 'yes' ? 
                        `https://${ip}:${port}` : 
                        `http://${ip}:${port}`;
                    allProxies.add(proxy);
                    count++;
                }
            }
        });
        
        console.log(chalk.green(`✓ Found ${count} proxies from Free Proxy List`));
    } catch (error) {
        console.log(chalk.red(`✗ Free Proxy List failed: ${error.message}`));
    }
}

async function scrapeProxyScrape() {
    try {
        console.log(chalk.yellow('Fetching from ProxyScrape API...'));
        const response = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const proxies = response.data.split('\n').filter(p => p.trim());
        let count = 0;
        
        proxies.forEach(proxy => {
            if (proxy && proxy.includes(':')) {
                allProxies.add(`http://${proxy.trim()}`);
                count++;
            }
        });
        
        console.log(chalk.green(`✓ Found ${count} proxies from ProxyScrape`));
    } catch (error) {
        console.log(chalk.red(`✗ ProxyScrape failed: ${error.message}`));
    }
}

async function scrapeGeoNode() {
    try {
        console.log(chalk.yellow('Fetching from GeoNode API...'));
        const response = await axios.get('https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        let count = 0;
        if (response.data && response.data.data) {
            response.data.data.forEach(proxy => {
                if (proxy.ip && proxy.port) {
                    const protocol = proxy.protocols && proxy.protocols.length > 0 ? proxy.protocols[0] : 'http';
                    allProxies.add(`${protocol}://${proxy.ip}:${proxy.port}`);
                    count++;
                }
            });
        }
        
        console.log(chalk.green(`✓ Found ${count} proxies from GeoNode`));
    } catch (error) {
        console.log(chalk.red(`✗ GeoNode failed: ${error.message}`));
    }
}

async function scrapePubProxy() {
    try {
        console.log(chalk.yellow('Fetching from PubProxy API...'));
        const response = await axios.get('http://pubproxy.com/api/proxy?limit=20&format=txt&type=http', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const proxies = response.data.split('\n').filter(p => p.trim());
        let count = 0;
        
        proxies.forEach(proxy => {
            if (proxy && proxy.includes(':')) {
                allProxies.add(`http://${proxy.trim()}`);
                count++;
            }
        });
        
        console.log(chalk.green(`✓ Found ${count} proxies from PubProxy`));
    } catch (error) {
        console.log(chalk.red(`✗ PubProxy failed: ${error.message}`));
    }
}

async function scrapeProxyListDownload() {
    try {
        console.log(chalk.yellow('Fetching from Proxy-List.download...'));
        const response = await axios.get('https://www.proxy-list.download/api/v1/get?type=http', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const proxies = response.data.split('\n').filter(p => p.trim());
        let count = 0;
        
        proxies.forEach(proxy => {
            if (proxy && proxy.includes(':')) {
                allProxies.add(`http://${proxy.trim()}`);
                count++;
            }
        });
        
        console.log(chalk.green(`✓ Found ${count} proxies from Proxy-List.download`));
    } catch (error) {
        console.log(chalk.red(`✗ Proxy-List.download failed: ${error.message}`));
    }
}

async function scrapeAll() {
    console.log(chalk.cyan('\nStarting proxy collection...\n'));
    
    await scrapeProxyScrape();
    await scrapeGeoNode();
    await scrapePubProxy();
    await scrapeProxyListDownload();
    await scrapeProxyList1();
    
    console.log(chalk.cyan('\n' + '-'.repeat(60)));
    console.log(chalk.green.bold(`\nTotal unique proxies collected: ${allProxies.size}`));
    
    if (allProxies.size > 0) {
        const proxyArray = Array.from(allProxies);
        
        const config = {
            proxies: proxyArray,
            enabled: false,
            rotationMode: "random",
            lastUpdated: new Date().toISOString()
        };
        
        const configPath = path.join(__dirname, '../proxies.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        console.log(chalk.green(`\n✓ Saved ${proxyArray.length} proxies to proxies.json`));
        console.log(chalk.yellow('\nTo enable proxies, edit proxies.json and set "enabled": true'));
        console.log(chalk.gray('\nNote: Free proxies may be slow or unreliable. Test before use.\n'));
    } else {
        console.log(chalk.red('\n✗ No proxies were collected. Please try again later.\n'));
    }
}

scrapeAll().catch(error => {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
});
