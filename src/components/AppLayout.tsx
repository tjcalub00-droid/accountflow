'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On mobile, close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const isExpanded = !collapsed || hovered;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger button — only visible on mobile */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border shadow-sm text-foreground"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar:
          - Mobile: fully hidden (translate-x-full) by default, slides in when mobileOpen
          - Desktop (lg+): always visible, supports hover expand
      */}
      <div
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-300 ${
          isMobile
            ? mobileOpen
              ? 'translate-x-0' :'-translate-x-full' :'translate-x-0'
        }`}
      >
        <Sidebar
          collapsed={isMobile ? false : !isExpanded}
          onToggle={() => setCollapsed((v) => !v)}
          onMouseEnter={isMobile ? undefined : () => setHovered(true)}
          onMouseLeave={isMobile ? undefined : () => setHovered(false)}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      <main
        className={`flex-1 min-h-screen content-transition ${
          !isMobile ? (isExpanded ? 'lg:ml-60' : 'lg:ml-16') : ''
        } ml-0`}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}