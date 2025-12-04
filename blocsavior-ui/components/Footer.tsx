import { Github, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-foreground mb-3 uppercase tracking-wider">Bloc Saviour</h3>
            <p className="text-muted-foreground text-sm">
              Blockchain-powered DDoS prevention and IP reputation management system.
              Real-time threat detection and tracking.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h3 className="font-bold text-foreground mb-3 uppercase tracking-wider">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="/api" className="hover:text-foreground transition-colors">API Reference</a></li>
              <li><a href="https://github.com" className="hover:text-foreground transition-colors flex items-center space-x-1">
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a></li>
            </ul>
          </div>
          
          {/* Stats */}
          <div>
            <h3 className="font-bold text-foreground mb-3 uppercase tracking-wider">Network</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-primary">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consensus:</span>
                <span className="text-foreground">Aura + GRANDPA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Block Time:</span>
                <span className="text-foreground">6 seconds</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center space-x-1">
            <span>Built with</span>
            <Heart className="w-4 h-4 text-destructive fill-current" />
            <span>using Substrate & Polkadot SDK</span>
          </p>
          <p className="mt-2">© 2024 Bloc Saviour. Open source under Unlicense.</p>
        </div>
      </div>
    </footer>
  );
}
