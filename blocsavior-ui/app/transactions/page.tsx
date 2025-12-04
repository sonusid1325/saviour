'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlocSaviourAPI } from '@/lib/api/blockchain-real';
import { Transaction } from '@/lib/types/blockchain';
import { ArrowUpRight, Activity, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!loading) setIsRefreshing(true);
        const txs = await BlocSaviourAPI.getRecentTransactions(50);
        setTransactions(txs);
        setStats({
          total: txs.length,
          successful: txs.filter(tx => tx.status === 'success').length,
          failed: txs.filter(tx => tx.status === 'failed').length,
        });
        setLastUpdate(new Date());
        setLoading(false);
        setTimeout(() => setIsRefreshing(false), 500);
      } catch (error) {
        console.error('Error loading transactions:', error);
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-card w-64 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-card rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Recent Transactions</h1>
            <p className="text-muted-foreground">IP Token operations on the blockchain</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <div className={`w-2 h-2 ${isRefreshing ? 'bg-primary animate-pulse' : 'bg-primary animate-pulse'}`}></div>
              <span>Auto-updating • Last update: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-8 w-8" />
            <span className="text-3xl font-bold">{transactions.length}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border transition-all animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary transition-all">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border transition-all animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Successful
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground transition-all">
                {stats.successful}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border transition-all animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive transition-all">
                {stats.failed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Latest IP Token operations</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No transactions yet</p>
                <p className="text-sm">Start minting IPs to see transactions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.hash}
                    className="border border-border  p-4 hover:border-accent hover:bg-card/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-sm font-mono bg-card px-2 py-1">
                            {formatHash(tx.hash)}
                          </code>
                          <Badge
                            className={
                              tx.status === 'success'
                                ? 'bg-secondary text-secondary-foreground border-border'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            }
                          >
                            {tx.status === 'success' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Success</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                            )}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {tx.type}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(tx.timestamp)}
                          </div>
                          <div>
                            Block: <span className="text-blue-500">#{tx.blockNumber}</span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/block/${tx.blockNumber}`}
                        className="text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        <ArrowUpRight className="h-5 w-5" />
                      </Link>
                    </div>

                    {tx.from && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground">From: </span>
                          <code className="text-muted-foreground">{formatHash(tx.from)}</code>
                        </div>
                        {tx.ipAddress && (
                          <div>
                            <span className="text-muted-foreground">IP: </span>
                            <code className="text-muted-foreground">{tx.ipAddress}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Source Notice */}
        {transactions.length === 0 && !loading && (
          <Card className="bg-muted border-border">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-primary font-medium mb-1">
                    No Transactions Found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connected to blockchain but no IP Token transactions found yet. Transactions will appear here when IPs are minted or updated.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
