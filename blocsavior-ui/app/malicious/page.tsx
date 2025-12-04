'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlocSaviourAPI } from '@/lib/api/blockchain-real';
import type { IpTokenData, ThreatLevel } from '@/lib/types/blockchain';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function MaliciousIPsPage() {
  const [maliciousIPs, setMaliciousIPs] = useState<IpTokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!loading) setIsRefreshing(true);
        const ips = await BlocSaviourAPI.getAllMaliciousIps();
        setMaliciousIPs(ips);
        setLastUpdate(new Date());
        setLoading(false);
        setTimeout(() => setIsRefreshing(false), 500);
      } catch (error) {
        console.error('Error loading malicious IPs:', error);
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getThreatBadgeColor = (level: ThreatLevel) => {
    switch (level) {
      case 'malicious':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'suspicious':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
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
            <h1 className="text-4xl font-bold mb-2">Malicious IP Addresses</h1>
            <p className="text-muted-foreground">Flagged as threats on the blockchain</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <div className={`w-2 h-2 ${isRefreshing ? 'bg-primary animate-pulse' : 'bg-primary animate-pulse'}`}></div>
              <span>Auto-updating • Last update: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <AlertTriangle className="h-8 w-8" />
            <span className="text-3xl font-bold">{maliciousIPs.length}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border transition-all animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Malicious
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary transition-all">
                {maliciousIPs.filter(ip => ip.threatLevel === 'malicious').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border transition-all animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suspicious
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground transition-all">
                {maliciousIPs.filter(ip => ip.threatLevel === 'suspicious').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border transition-all animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Confidence
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground transition-all">
                {maliciousIPs.filter(ip => ip.confidenceScore >= 80).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* IP List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Threat List</CardTitle>
            <CardDescription>Click any IP to view full details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maliciousIPs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No malicious IPs found</p>
                  <p className="text-sm">The blockchain is clean!</p>
                </div>
              ) : (
                maliciousIPs.map((ip) => (
                  <Link key={ip.tokenId} href={`/ip/${ip.ipAddress}`}>
                    <div className="border border-border  p-4 hover:border-accent hover:bg-card/50 transition-all cursor-pointer animate-fadeIn">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <code className="text-lg font-mono bg-card px-3 py-1">
                            {ip.ipAddress}
                          </code>
                          <Badge className={getThreatBadgeColor(ip.threatLevel)}>
                            {ip.threatLevel}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <div className={`text-lg font-bold transition-colors ${
                            ip.confidenceScore >= 80 ? 'text-primary' :
                            ip.confidenceScore >= 50 ? 'text-muted-foreground' :
                            'text-secondary-foreground'
                          }`}>
                            {ip.confidenceScore}%
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {ip.attackTypes?.map((type, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground">Flagged: </span>
                          {ip.flaggedCount} times
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Updated: </span>
                          Block #{ip.lastUpdated}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Token ID: </span>
                          #{ip.tokenId}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Source Notice */}
        {maliciousIPs.length === 0 && !loading && (
          <Card className="bg-muted border-border">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-primary font-medium mb-1">
                    No Data Found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connected to blockchain but no malicious IPs found. Start flagging IPs to see them here.
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
