"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Shield, TrendingUp, Clock, Database } from "lucide-react";
import { BlocSaviourAPI } from "@/lib/api/blockchain-real";
import { BlockchainStats, IpTokenData, Transaction } from "@/lib/types/blockchain";
import { formatBlockNumber, getThreatLevelColor, truncateHash, getRelativeTime } from "@/lib/utils/blockchain-utils";

export default function Dashboard() {
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [recentTokens, setRecentTokens] = useState<IpTokenData[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Dashboard: Connecting to blockchain...');
        await BlocSaviourAPI.connect();
        console.log('Dashboard: Connected!');

        const [statsData, tokensData, txsData] = await Promise.all([
          BlocSaviourAPI.getStats(),
          BlocSaviourAPI.getAllTokens(5),
          BlocSaviourAPI.getRecentTransactions(5),
        ]);

        console.log('Dashboard stats:', statsData);

        setStats({
          ...statsData,
          totalIps: statsData.total_tokens,
          maliciousIps: statsData.malicious_count,
          cleanIps: statsData.clean_count,
          recentActivity: txsData.length,
          lastUpdate: Date.now(),
          blockHeight: statsData.latest_block
        });
        setRecentTokens(tokensData);
        setRecentTxs(txsData);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Dashboard: Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 6000); // Refresh every 6s
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading blockchain data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total IP Tokens",
      value: formatBlockNumber(stats.total_tokens || 0),
      icon: Database,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Malicious IPs",
      value: formatBlockNumber(stats.malicious_count || 0),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Clean IPs",
      value: formatBlockNumber(stats.clean_count || 0),
      icon: Shield,
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
    {
      title: "Latest Block",
      value: formatBlockNumber(stats.latest_block || 0),
      icon: TrendingUp,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bloc Saviour Explorer</h1>
          <p className="text-muted-foreground mt-1">Real-time DDoS prevention blockchain monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-400  animate-pulse"></div>
            <span className="text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="border border-border p-6 bg-card card-double-border hover:border-accent transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3  ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent IP Tokens */}
        <div className="border border-border  p-6 bg-card card-double-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Recent IP Tokens</h2>
            <Link href="/ip-tokens" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {recentTokens.map((token) => (
              <Link
                key={token.tokenId}
                href={`/ip/${token.ipAddress}`}
                className="flex items-center justify-between p-3  border border-border hover:border-accent hover:bg-secondary/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="font-mono text-foreground">{token.ipAddress}</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getThreatLevelColor(token.threatLevel)}`}>
                    {token.threatLevel}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  #{token.tokenId}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="border border-border  p-6 bg-card card-double-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {recentTxs.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between p-3  border border-border hover:border-accent hover:bg-secondary/50 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono text-sm text-foreground truncate">
                      {truncateHash(tx.hash)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{getRelativeTime(tx.timestamp)}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm text-foreground">Block {tx.blockNumber || tx.block_number}</div>
                  <div className={`text-xs ${tx.success ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.success ? '✓' : '✗'} {tx.method}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="border border-border  p-6 bg-card card-double-border">
        <h3 className="text-lg font-bold text-foreground mb-4">Threat Distribution</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Malicious</span>
              <span className="text-foreground">{stats.malicious_count || 0} / {stats.total_tokens || 0}</span>
            </div>
            <div className="h-2 bg-border overflow-hidden">
              <div
                className="h-full bg-destructive"
                style={{ width: `${((stats.malicious_count || 0) / (stats.total_tokens || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Suspicious</span>
              <span className="text-foreground">{stats.suspicious_count || 0} / {stats.total_tokens || 0}</span>
            </div>
            <div className="h-2 bg-border overflow-hidden">
              <div
                className="h-full bg-muted-foreground"
                style={{ width: `${((stats.suspicious_count || 0) / (stats.total_tokens || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Clean</span>
              <span className="text-foreground">{stats.clean_count || 0} / {stats.total_tokens || 0}</span>
            </div>
            <div className="h-2 bg-border overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${((stats.clean_count || 0) / (stats.total_tokens || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
