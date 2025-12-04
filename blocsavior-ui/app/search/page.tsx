'use client';

import { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, Loader2, Shield } from 'lucide-react';
import { BlocSaviourAPI } from '@/lib/api/blockchain-real';
import type { IpTokenData, ThreatLevel, AttackType } from '@/lib/types/blockchain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getThreatLevelColor } from '@/lib/utils/blockchain-utils';

export default function SearchPage() {
  const [ipAddress, setIpAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [result, setResult] = useState<IpTokenData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    setSearching(true);
    setNotFound(false);
    setResult(null);
    setReportSuccess(null);

    try {
      await BlocSaviourAPI.connect();
      const data = await BlocSaviourAPI.getIpReputation(ipAddress.trim());
      
      if (data) {
        setResult(data);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleReportMalicious = async () => {
    if (!ipAddress.trim()) return;

    setReporting(true);
    setReportSuccess(null);

    try {
      const response = await BlocSaviourAPI.reportIp(ipAddress.trim(), {
        isMalicious: true,
        threatLevel: 'malicious',
        attackTypes: ['OTHER'],
        description: 'Reported by user'
      });

      setReportSuccess(
        response.isNew 
          ? `✅ New IP NFT created! Transaction: ${response.txHash.substring(0, 16)}...`
          : `✅ IP updated to malicious! Transaction: ${response.txHash.substring(0, 16)}...`
      );

      // Refresh the result
      const updated = await BlocSaviourAPI.getIpReputation(ipAddress.trim());
      if (updated) setResult(updated);
      setNotFound(false);
    } catch (error) {
      console.error('Report error:', error);
      setReportSuccess('❌ Failed to report IP');
    } finally {
      setReporting(false);
    }
  };

  const handleReportClean = async () => {
    if (!ipAddress.trim()) return;

    setReporting(true);
    setReportSuccess(null);

    try {
      const response = await BlocSaviourAPI.reportIp(ipAddress.trim(), {
        isMalicious: false,
        threatLevel: 'clean',
        attackTypes: [],
        description: 'Reported as clean by user'
      });

      setReportSuccess(
        response.isNew 
          ? `✅ New clean IP NFT created! Transaction: ${response.txHash.substring(0, 16)}...`
          : `✅ IP updated to clean! Transaction: ${response.txHash.substring(0, 16)}...`
      );

      // Refresh the result
      const updated = await BlocSaviourAPI.getIpReputation(ipAddress.trim());
      if (updated) setResult(updated);
      setNotFound(false);
    } catch (error) {
      console.error('Report error:', error);
      setReportSuccess('❌ Failed to report IP');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">IP Search & Report</h1>
        <p className="text-muted-foreground">
          Search for IP addresses and report malicious activity. Each report creates an NFT on the blockchain.
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search IP Address</CardTitle>
          <CardDescription>
            Enter an IP address to check its reputation or create a new report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g., 192.168.1.1"
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                title="Please enter a valid IP address (e.g., 192.168.1.1)"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {reportSuccess && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {reportSuccess}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>IP Reputation: {result.ipAddress}</span>
              <Badge className={getThreatLevelColor(result.threatLevel)}>
                {result.threatLevel.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>Token ID: #{result.tokenId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-semibold">
                  {result.isMalicious ? (
                    <span className="text-red-400">Malicious</span>
                  ) : (
                    <span className="text-green-400">Clean</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="font-semibold">{result.confidenceScore}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Flagged Count</div>
                <div className="font-semibold">{result.flaggedCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="font-semibold">
                  {new Date(result.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>

            {result.attackTypes.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Attack Types</div>
                <div className="flex flex-wrap gap-2">
                  {result.attackTypes.map((type, idx) => (
                    <Badge key={idx} variant="outline">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={handleReportMalicious}
                disabled={reporting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
              >
                {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Report as Malicious
              </button>
              <button
                onClick={handleReportClean}
                disabled={reporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
              >
                {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Report as Clean
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Found - Create New */}
      {notFound && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              IP Not Found: {ipAddress}
            </CardTitle>
            <CardDescription>
              This IP address hasn't been reported yet. Create a new NFT by reporting it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                onClick={handleReportMalicious}
                disabled={reporting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
              >
                {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Create Malicious IP NFT
              </button>
              <button
                onClick={handleReportClean}
                disabled={reporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
              >
                {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Create Clean IP NFT
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
