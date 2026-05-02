import { Code, ExternalLink, Shield, Lock, Cpu, Globe } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-bg-elevated border-t border-border-subtle py-24 mt-24">
      <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-screen-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col gap-6 md:col-span-1">
            <Link
              href="/"
              className="text-2xl font-display font-medium tracking-[0.2em] uppercase text-text-primary"
            >
              TESSERA
            </Link>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              Cryptographic creditworthiness for the decentralized economy. 
              Built on the Umbra stealth address protocol.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <h4 className="text-overline text-text-primary">Ecosystem</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/employer" className="text-body-sm text-text-secondary hover:text-cipher transition-colors">Shield Salaries</Link>
              <Link href="/employee" className="text-body-sm text-text-secondary hover:text-cipher transition-colors">Generate Proof</Link>
              <Link href="/agent" className="text-body-sm text-text-secondary hover:text-cipher transition-colors">Agent Mesh</Link>
              <Link href="/verify" className="text-body-sm text-text-secondary hover:text-cipher transition-colors">Verify Portal</Link>
            </nav>
          </div>

          <div className="flex flex-col gap-6">
            <h4 className="text-overline text-text-primary">Protocol</h4>
            <nav className="flex flex-col gap-3">
              <a href="#" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                Whitepaper <ExternalLink className="w-3 h-3" />
              </a>
              <a href="#" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                Security Audit <ExternalLink className="w-3 h-3" />
              </a>
              <a href="#" className="text-body-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                ZK Circuits <ExternalLink className="w-3 h-3" />
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-6">
            <h4 className="text-overline text-text-primary">Network</h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Mainnet Alpha</span>
              </div>
              <div className="flex gap-4">
                <a href="https://github.com/umbraprivacy/tessera" className="p-2 rounded-md bg-bg-surface border border-border-subtle hover:border-cipher transition-colors">
                  <Code className="w-4 h-4 text-text-secondary" />
                </a>
                <a href="#" className="p-2 rounded-md bg-bg-surface border border-border-subtle hover:border-cipher transition-colors">
                  <Globe className="w-4 h-4 text-text-secondary" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-mono text-text-muted uppercase tracking-[0.2em]">
            © 2026 TESSERA PROTOCOL · UMBRA SHIELDED
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Shield className="w-3 h-3" />
              NON-CUSTODIAL
            </div>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Lock className="w-3 h-3" />
              ZERO-KNOWLEDGE
            </div>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Cpu className="w-3 h-3" />
              SOLANA ANCHOR
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
