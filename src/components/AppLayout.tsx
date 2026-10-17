'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, X, ChevronRight } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // `pinned` = user clicked to keep sidebar open; `hovered` = temporary reveal on hover
  const [pinned, setPinned] = useState(false);
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

  const isExpanded = pinned || hovered;

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

      {/* Desktop hover/click edge handle — reveals the hidden sidebar */}
      {!isMobile && !isExpanded && (
        <div
          className="fixed left-0 top-0 h-full w-3 z-30 hidden lg:block"
          onMouseEnter={() => setHovered(true)}
        >
          <button
            type="button"
            onClick={() => setPinned(true)}
            aria-label="Open sidebar"
            className="absolute left-0 top-20 w-5 h-10 bg-card border border-l-0 border-border rounded-r-lg flex items-center justify-center shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Sidebar:
          - Mobile: hidden off-screen by default, slides in when mobileOpen
          - Desktop (lg+): hidden off-screen, slides in on hover of the edge or when pinned
      */}
      <div
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-300 ${
          isMobile
            ? mobileOpen
              ? 'translate-x-0' :'-translate-x-full' : isExpanded ?'translate-x-0 shadow-xl' :'-translate-x-full'
        }`}
      >
        <Sidebar
          collapsed={false}
          onToggle={() => {
            setPinned(false);
            setHovered(false);
          }}
          onMouseEnter={isMobile ? undefined : () => setHovered(true)}
          onMouseLeave={
            isMobile
              ? undefined
              : () => {
                  setHovered(false);
                  setPinned(false);
                }
          }
          onNavClick={() => {
            setMobileOpen(false);
            setHovered(false);
            setPinned(false);
          }}
        />
      </div>

      <main
        className="flex-1 min-h-screen content-transition ml-0"
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}