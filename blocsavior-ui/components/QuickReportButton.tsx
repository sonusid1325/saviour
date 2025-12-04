'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { BlocSaviourAPI } from '@/lib/api/blockchain-real';

interface QuickReportProps {
  ipAddress: string;
  onSuccess?: (txHash: string, isNew: boolean) => void;
  className?: string;
}

export function QuickReportButton({ ipAddress, onSuccess, className = '' }: QuickReportProps) {
  const [reporting, setReporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleReport = async (isMalicious: boolean) => {
    setReporting(true);
    try {
      const response = await BlocSaviourAPI.reportIp(ipAddress, {
        isMalicious,
        threatLevel: isMalicious ? 'malicious' : 'clean',
        attackTypes: isMalicious ? ['OTHER'] : [],
      });

      if (onSuccess) {
        onSuccess(response.txHash, response.isNew);
      }
      
      setShowOptions(false);
    } catch (error) {
      console.error('Report failed:', error);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={reporting}
        className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 disabled:opacity-50 text-sm"
      >
        {reporting ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Report IP'}
      </button>

      {showOptions && !reporting && (
        <div className="absolute right-0 mt-2 bg-card border rounded-lg shadow-lg p-2 space-y-2 z-10 min-w-[200px]">
          <button
            onClick={() => handleReport(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded"
          >
            <AlertTriangle className="h-4 w-4" />
            Report Malicious
          </button>
          <button
            onClick={() => handleReport(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded"
          >
            <CheckCircle className="h-4 w-4" />
            Report Clean
          </button>
        </div>
      )}
    </div>
  );
}
