'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Filter, ChevronDown } from "lucide-react";
import { BlocSaviourAPI } from "@/lib/api/blockchain-real";
import type { IpTokenData, ThreatLevel } from "@/lib/types/blockchain";
import { getThreatLevelColor, getConfidenceColor, formatAttackType } from "@/lib/utils/blockchain-utils";
import { QuickReportButton } from "@/components/QuickReportButton";

export default function IpTokensPage() {
  const [tokens, setTokens] = useState<IpTokenData[]>([]);
  const [filter, setFilter] = useState<ThreatLevel | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function fetchTokens() {
      try {
        if (!loading) setIsRefreshing(true);

        // Try to fetch directly from blockchain first
        let data = await BlocSaviourAPI.getAllTokens();

        // If blockchain returns nothing, fallback to server (for backwards compatibility)
        if (!data || data.length === 0) {
          console.log('No tokens from blockchain, trying server...');
          data = await BlocSaviourAPI.getServerTokens('http://localhost:8080');
        }

        setAllTokens(data); // Store all tokens for counting

        // Filter based on selected threat level (case-insensitive)
        const filtered = filter === "all"
          ? data
          : data.filter(token => token.threatLevel.toLowerCase() === filter.toLowerCase());

        setTokens(filtered);
        setLastUpdate(new Date());
        setLoading(false);
        setTimeout(() => setIsRefreshing(false), 500);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
        setLoading(false);
        setIsRefreshing(false);
      }
    }
    fetchTokens();
    const interval = setInterval(fetchTokens, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [filter]);

  // Get all tokens unfiltered to count properly
  const [allTokens, setAllTokens] = useState<IpTokenData[]>([]);

  const filterOptions = [
    { value: "all", label: "All Tokens", count: allTokens.length },
    { value: "clean", label: "Clean", count: allTokens.filter(t => t.threatLevel?.toLowerCase() === "clean").length },
    { value: "suspicious", label: "Suspicious", count: allTokens.filter(t => t.threatLevel?.toLowerCase() === "suspicious").length },
    { value: "malicious", label: "Malicious", count: allTokens.filter(t => t.threatLevel?.toLowerCase() === "malicious").length },
    { value: "rehabilitated", label: "Rehabilitated", count: allTokens.filter(t => t.threatLevel?.toLowerCase() === "rehabilitated").length },
    { value: "unknown", label: "Unknown", count: allTokens.filter(t => !t.threatLevel || t.threatLevel?.toLowerCase() === "unknown").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">IP Tokens</h1>
          <p className="text-muted-foreground mt-1">Browse all IP addresses tracked on the blockchain</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <div className={`w-2 h-2 ${isRefreshing ? 'bg-primary animate-pulse' : 'bg-primary animate-pulse'}`}></div>
            <span>Auto-updating • Last update: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 border border-border  hover:bg-card transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border border-border  p-4 bg-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Filter by Threat Level</h3>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const isActive = filter === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as any)}
                  className={`
                    px-4 py-2  border transition-all
                    ${isActive
                      ? 'bg-primary text-primary-foreground border-primary font-bold'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-accent'
                    }
                  `}
                >
                  {option.label}
                  <span className={`ml-2 ${isActive ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                    ({option.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border  overflow-hidden bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary  animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Threat Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Attack Types
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Flagged
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Token ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No IP tokens found matching your filter
                    </td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr
                      key={token.tokenId}
                      className="hover:bg-card/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/ip/${token.ipAddress}`}
                          className="font-mono text-foreground hover:text-primary transition-colors"
                        >
                          {token.ipAddress}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1  text-xs font-medium ${getThreatLevelColor(token.threatLevel)}`}>
                          {token.threatLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium ${getConfidenceColor(token.confidenceScore)}`}>
                          {token.confidenceScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {token.attackTypes.length > 0 ? (
                            token.attackTypes.map((type, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-card text-muted-foreground"
                              >
                                {formatAttackType(type)}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-foreground">
                        {token.flaggedCount}x
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        #{token.tokenId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <QuickReportButton
                          ipAddress={token.ipAddress}
                          onSuccess={() => {
                            // Refresh token list
                            window.location.reload();
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {tokens.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing <span className="text-foreground font-medium">{tokens.length}</span> IP tokens
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-destructive"></div>
              <span>{tokens.filter(t => t.isMalicious).length} Malicious</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary"></div>
              <span>{tokens.filter(t => t.threatLevel === 'clean').length} Clean</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
