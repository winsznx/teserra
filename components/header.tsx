"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Employer", href: "/employer" },
    { name: "Employee", href: "/employee" },
    { name: "Agent", href: "/agent" },
    { name: "Verify", href: "/verify" },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 bg-bg-elevated/80 backdrop-blur-md border-b border-border-subtle">
      <div className="container mx-auto h-full px-4 md:px-8 lg:px-12 max-w-screen-xl flex items-center justify-between">
        {/* Left: Wordmark */}
        <Link
          href="/"
          className="text-xl font-display font-medium tracking-[0.16em] uppercase text-text-primary"
        >
          TESSERA
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative py-1 text-body-sm font-medium transition-colors ${
                  isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.name}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-px bg-cipher"
                    initial={false}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden md:block">
            <WalletConnectButton />
          </div>
          <button
            className="md:hidden text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-bg-elevated border-b border-border-subtle p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-body font-medium text-text-secondary py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="mt-2">
            <WalletConnectButton />
          </div>
        </div>
      )}
    </header>
  );
}
