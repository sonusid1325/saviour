import express from 'express';
import cors from 'cors';
import { BlocSaviourAPI } from './api/blockchain.js';

const app = express();
const PORT = 2222;

app.use(cors());
app.use(express.json());

// Routes

// Get blockchain stats
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await BlocSaviourAPI.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all tokens
app.get('/api/tokens', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const tokens = await BlocSaviourAPI.getAllTokens(limit);
        res.json(tokens);
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Failed to fetch tokens' });
    }
});

// Get malicious IPs
app.get('/api/malicious-ips', async (req, res) => {
    try {
        const maliciousIps = await BlocSaviourAPI.getAllMaliciousIps();
        res.json(maliciousIps);
    } catch (error) {
        console.error('Error fetching malicious IPs:', error);
        res.status(500).json({ error: 'Failed to fetch malicious IPs' });
    }
});

// Get recent transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const transactions = await BlocSaviourAPI.getRecentTransactions(limit);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get specific IP token details
app.get('/api/ip/:ip', async (req, res) => {
    try {
        const ip = req.params.ip;
        const token = await BlocSaviourAPI.getIpToken(ip);
        if (token) {
            res.json(token);
        } else {
            res.status(404).json({ error: 'IP token not found' });
        }
    } catch (error) {
        console.error('Error fetching IP token:', error);
        res.status(500).json({ error: 'Failed to fetch IP token' });
    }
});

// Check if IP is whitelisted
app.get('/api/whitelist/:ip', async (req, res) => {
    try {
        const ip = req.params.ip;
        const isWhitelisted = await BlocSaviourAPI.isWhitelisted(ip);
        res.json({ ip, isWhitelisted });
    } catch (error) {
        console.error('Error checking whitelist:', error);
        res.status(500).json({ error: 'Failed to check whitelist' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Analysis server running on port ${PORT}`);
});
