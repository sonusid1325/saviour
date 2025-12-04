"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Shield, Activity, Database, AlertTriangle } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  
  const links = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/ip-tokens", label: "IP Tokens", icon: Database },
    { href: "/malicious", label: "Malicious IPs", icon: AlertTriangle },
    { href: "/transactions", label: "Transactions", icon: Activity },
  ];
  
  return (
    <nav className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
            <Shield className="w-6 h-6 text-primary" />
            <span className="hidden sm:inline">
              <span className="text-foreground">BLOC</span>{" "}
              <span className="text-muted-foreground">SAVIOUR</span>
            </span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center space-x-1 px-4 py-2 transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground font-bold' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Search */}
          <div className="flex items-center space-x-4">
            <Link
              href="/search"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-1 pb-3 overflow-x-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center space-x-1 px-3 py-1.5 transition-colors whitespace-nowrap text-sm
                  ${isActive 
                    ? 'bg-primary text-primary-foreground font-bold' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
