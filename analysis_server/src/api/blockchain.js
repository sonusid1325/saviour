import { ApiPromise, WsProvider } from '@polkadot/api';
import { u32ToIp, ipToU32 } from '../utils/blockchain-utils.js';

class BlocSaviourAPIClass {
    constructor(wsUrl = 'ws://127.0.0.1:9944') {
        this.api = null;
        this.wsUrl = wsUrl;
        this.isConnecting = false;
        this.connectionPromise = null;
    }

    async connect() {
        if (this.api?.isConnected) return;

        if (this.isConnecting && this.connectionPromise) {
            return this.connectionPromise;
        }

        this.isConnecting = true;
        this.connectionPromise = (async () => {
            try {
                const provider = new WsProvider(this.wsUrl);
                this.api = await ApiPromise.create({ provider });
                await this.api.isReady;
                console.log('✅ Connected to BlocSaviour blockchain');
            } catch (error) {
                console.error('Failed to connect to blockchain:', error);
                this.api = null;
                throw error;
            } finally {
                this.isConnecting = false;
            }
        })();

        return this.connectionPromise;
    }

    async disconnect() {
        if (this.api) {
            await this.api.disconnect();
            this.api = null;
        }
    }

    formatIpTokenData(ipString, data) {
        // Convert threat level to lowercase string
        let threatLevel = 'unknown';
        if (data.threatLevel) {
            const level = data.threatLevel.toString().toLowerCase();
            if (['clean', 'suspicious', 'malicious', 'rehabilitated', 'unknown'].includes(level)) {
                threatLevel = level;
            }
        }

        return {
            ipAddress: ipString,
            tokenId: data.tokenId || 0,
            firstSeen: data.firstSeen || 0,
            lastUpdated: data.lastUpdated || data.firstSeen || 0,
            threatLevel: threatLevel,
            confidenceScore: data.confidenceScore || 0,
            isMalicious: data.isMalicious || false,
            attackTypes: (data.attackTypes || []),
            flaggedCount: data.flaggedCount || 0,
            falsePositiveCount: data.falsePositiveCount || 0,
            history: [],
        };
    }

    async getBlockNumber() {
        await this.connect();
        const header = await this.api.rpc.chain.getHeader();
        return header.number.toNumber();
    }

    async getTotalIpCount() {
        await this.connect();
        const entries = await this.api.query.ipToken.ipTokens.entries();
        return entries.length;
    }

    async getMaliciousIpCount() {
        await this.connect();
        const result = await this.api.query.ipToken.maliciousCount();
        return result.toNumber();
    }

    async getCleanIpCount() {
        await this.connect();
        const entries = await this.api.query.ipToken.ipTokens.entries();
        let cleanCount = 0;
        entries.forEach(([, value]) => {
            const token = value.toJSON();
            if (token.threatLevel === 'Clean') cleanCount++;
        });
        return cleanCount;
    }

    async getStats() {
        await this.connect();

        const [blockNumber, entries] = await Promise.all([
            this.getBlockNumber(),
            this.api.query.ipToken.ipTokens.entries()
        ]);

        let maliciousCount = 0;
        let cleanCount = 0;
        let suspiciousCount = 0;

        entries.forEach(([, value]) => {
            const token = value.toJSON();
            const threatLevel = token.threatLevel || 'Unknown';

            if (threatLevel === 'Malicious') maliciousCount++;
            else if (threatLevel === 'Clean') cleanCount++;
            else if (threatLevel === 'Suspicious') suspiciousCount++;
        });

        return {
            total_tokens: entries.length,
            malicious_count: maliciousCount,
            clean_count: cleanCount,
            suspicious_count: suspiciousCount,
            latest_block: blockNumber,
            total_transactions: 0,
        };
    }

    async getIpToken(ipAddress) {
        await this.connect();

        try {
            const ipU32 = ipToU32(ipAddress);
            const result = await this.api.query.ipToken.ipTokens(ipU32);

            if (result.isEmpty) {
                return null;
            }

            const data = result.toJSON();
            return this.formatIpTokenData(ipAddress, data);
        } catch (error) {
            console.error('Error fetching IP token:', error);
            return null;
        }
    }

    async getAllTokens(limit = 100) {
        await this.connect();

        try {
            const entries = await this.api.query.ipToken.ipTokens.entries();
            const tokens = [];

            for (const [key, value] of entries.slice(0, limit)) {
                const ipU32 = key.toHuman()[0];
                const ipString = u32ToIp(parseInt(ipU32.replace(/,/g, '')));
                const data = value.toJSON();
                tokens.push(this.formatIpTokenData(ipString, data));
            }

            return tokens.sort((a, b) => b.lastUpdated - a.lastUpdated);
        } catch (error) {
            console.error('Error fetching all tokens:', error);
            return [];
        }
    }

    async getAllMaliciousIps() {
        await this.connect();

        try {
            const entries = await this.api.query.ipToken.ipTokens.entries();
            const maliciousIps = [];

            for (const [key, value] of entries) {
                const data = value.toJSON();
                if (data.isMalicious || data.threatLevel === 'Malicious') {
                    const ipU32 = key.toHuman()[0];
                    const ipString = u32ToIp(parseInt(ipU32.replace(/,/g, '')));
                    maliciousIps.push(this.formatIpTokenData(ipString, data));
                }
            }

            return maliciousIps.sort((a, b) => b.confidenceScore - a.confidenceScore);
        } catch (error) {
            console.error('Error fetching malicious IPs:', error);
            return [];
        }
    }

    async getRecentTransactions(limit = 10) {
        await this.connect();

        try {
            const blockNumber = await this.getBlockNumber();
            const transactions = [];

            const blocksToCheck = Math.min(10, blockNumber);

            for (let i = 0; i < blocksToCheck && transactions.length < limit; i++) {
                const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber - i);
                const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
                const allRecords = await this.api.query.system.events.at(blockHash);

                signedBlock.block.extrinsics.forEach((extrinsic, index) => {
                    const { method: { method, section } } = extrinsic;

                    if (section === 'ipToken') {
                        const extrinsicEvents = allRecords.filter(({ phase }) =>
                            phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
                        );

                        const success = extrinsicEvents.some(({ event }) =>
                            this.api.events.system.ExtrinsicSuccess.is(event)
                        );

                        transactions.push({
                            hash: extrinsic.hash.toHex(),
                            blockNumber: blockNumber - i,
                            block_number: blockNumber - i, // Backward compat
                            method: `${section}.${method}`,
                            timestamp: Date.now() - (i * 6000),
                            status: success ? 'success' : 'failed',
                            from: extrinsic.signer.toString(),
                            type: 'Transaction',
                            ipAddress: 'Unknown',
                            details: `${section}.${method}`,
                        });
                    }
                });
            }

            return transactions.slice(0, limit);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async isWhitelisted(ipAddress) {
        await this.connect();
        try {
            const ipU32 = ipToU32(ipAddress);
            const result = await this.api.query.ipToken.whitelist(ipU32);
            return result.isTrue;
        } catch (error) {
            return false;
        }
    }
}

export const BlocSaviourAPI = new BlocSaviourAPIClass();
