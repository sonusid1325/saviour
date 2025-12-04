# Bloc Saviour Explorer - Frontend

A minimalist, monochrome blockchain explorer for the Bloc Saviour DDoS prevention blockchain, inspired by Solscan's clean design.

## 🎨 Design Philosophy

- **Monochrome Theme**: Black background with white/gray text for minimal distraction
- **High Contrast**: Easy to read, professional appearance
- **Real-time Updates**: Live data refresh every 10 seconds
- **Responsive**: Mobile-first design that works on all devices
- **Fast**: Optimized for performance with Next.js 14

## 🚀 Quick Start

```bash
# Install dependencies
npm install
# or
bun install

# Run development server
npm run dev
# or
bun dev

# Open browser
open http://localhost:3000
```

## 📁 Project Structure

```
blocsavior-ui/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Dashboard/Home
│   ├── ip-tokens/          # All IP tokens list
│   ├── malicious/          # Malicious IPs only
│   ├── transactions/       # Transaction list
│   ├── ip/[address]/       # IP details page
│   └── search/             # Search functionality
├── components/
│   ├── Navigation.tsx      # Top navigation bar
│   ├── Footer.tsx          # Footer component
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── api/
│   │   └── blockchain.ts   # API client (mock + real)
│   ├── types/
│   │   └── blockchain.ts   # TypeScript types
│   └── utils/
│       └── blockchain-utils.ts  # Utility functions
└── package.json
```

## 📄 Pages Created

### ✅ Completed
1. **Dashboard** (`/`) - Overview with stats, recent tokens, and transactions
2. **Navigation** - Top navbar with links and search
3. **Footer** - Network info and links

### 🔄 To Create
4. **IP Tokens List** (`/ip-tokens`) - Paginated list with filters
5. **Malicious IPs** (`/malicious`) - Filtered view of threats
6. **Transactions** (`/transactions`) - Blockchain transaction history
7. **IP Details** (`/ip/[address]`) - Detailed IP token view with history
8. **Search** (`/search`) - Search for IPs, transactions, blocks

## 🔌 API Integration

Currently using **mock data** in `lib/api/blockchain.ts`. 

### To integrate with real blockchain:

```typescript
// Install Polkadot.js
npm install @polkadot/api @polkadot/extension-dapp

// Update lib/api/blockchain.ts with:
import { ApiPromise, WsProvider } from '@polkadot/api';

const wsProvider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider: wsProvider });

// Query IP tokens
const token = await api.query.ipToken.ipTokens(ipAddress);
```

## 🎨 Color Scheme

```css
Background: #000000 (Black)
Text Primary: #FFFFFF (White)
Text Secondary: #9CA3AF (Gray-400)
Borders: #1F2937 (Gray-800)
Hover: #111827 (Gray-900)

Threat Colors:
- Clean: #10B981 (Green)
- Suspicious: #F59E0B (Yellow)
- Malicious: #EF4444 (Red)
- Unknown: #6B7280 (Gray)
- Rehabilitated: #3B82F6 (Blue)
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Blockchain**: Polkadot.js API (to be integrated)
- **TypeScript**: Full type safety

## 📋 Features

### Dashboard
- ✅ Live stats (Total IPs, Malicious, Clean, Latest Block)
- ✅ Recent IP tokens with threat levels
- ✅ Recent transactions
- ✅ Threat distribution chart
- ✅ Auto-refresh every 10 seconds

### Navigation
- ✅ Responsive navbar
- ✅ Active link highlighting
- ✅ Mobile menu
- ✅ Search icon

### Utilities
- ✅ IP ↔ u32 conversion
- ✅ Threat level coloring
- ✅ Relative time formatting
- ✅ Hash truncation
- ✅ Number formatting

## 🔜 Next Steps

### 1. Create IP Tokens List Page

Create `app/ip-tokens/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/blockchain";
import { IpTokenData, ThreatLevel } from "@/lib/types/blockchain";
import { getThreatLevelColor } from "@/lib/utils/blockchain-utils";

export default function IpTokensPage() {
  const [tokens, setTokens] = useState<IpTokenData[]>([]);
  const [filter, setFilter] = useState<ThreatLevel | "all">("all");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchTokens() {
      setLoading(true);
      const data = filter === "all" 
        ? await api.getIpTokens({ limit: 50 })
        : await api.getIpTokens({ threat_level: filter, limit: 50 });
      setTokens(data);
      setLoading(false);
    }
    fetchTokens();
  }, [filter]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">IP Tokens</h1>
      
      {/* Filter buttons */}
      <div className="flex space-x-2">
        {["all", ...Object.values(ThreatLevel)].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level as any)}
            className={`px-4 py-2 rounded ${
              filter === level ? 'bg-white text-black' : 'bg-gray-800 text-white'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      
      {/* Table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left">IP Address</th>
              <th className="px-4 py-3 text-left">Threat Level</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Flagged</th>
              <th className="px-4 py-3 text-left">Token ID</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.token_id} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-3 font-mono">{token.ip_string}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${getThreatLevelColor(token.threat_level)}`}>
                    {token.threat_level}
                  </span>
                </td>
                <td className="px-4 py-3">{token.confidence_score}%</td>
                <td className="px-4 py-3">{token.flagged_count}x</td>
                <td className="px-4 py-3">#{token.token_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 2. Create IP Details Page

Create `app/ip/[address]/page.tsx` for individual IP details with full history.

### 3. Add Real API Integration

Replace mock data in `lib/api/blockchain.ts` with Polkadot.js calls to your running blockchain node.

### 4. Add WebSocket Support

For real-time updates, use Polkadot.js subscriptions:

```typescript
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;
    if (event.section === 'ipToken') {
      // Update UI with new event
    }
  });
});
```

## 🎯 Key Utilities

### IP Conversion
```typescript
import { ipToU32, u32ToIp } from '@/lib/utils/blockchain-utils';

const ipNum = ipToU32("192.168.1.1");    // 3232235777
const ipStr = u32ToIp(3232235777);        // "192.168.1.1"
```

### Threat Colors
```typescript
import { getThreatLevelColor } from '@/lib/utils/blockchain-utils';

const colorClass = getThreatLevelColor("Malicious");
// Returns: "text-red-600 bg-red-100 dark:bg-red-900/30"
```

## 📊 Mock Data

Currently generates 100 mock IP tokens with random threat levels. Replace with real data by updating `lib/api/blockchain.ts`.

## 🔐 Security Notes

- Add authentication for admin actions
- Implement rate limiting on API calls
- Validate all user inputs
- Use HTTPS in production

## 📝 License

Unlicense - Free and open source

---

**Built with ❤️ for Bloc Saviour DDoS Prevention Blockchain**
