'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import Image from 'next/image';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  BarChart3,
  Users,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  UserCog,
  ImageIcon,
  UsersRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
      { href: '/alert-hub', label: 'Alert Hub', icon: ShieldAlert, badge: null },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { href: '/invoices-billing', label: 'Invoices & Billing', icon: FileText, badge: null },
      { href: '/expenses', label: 'Expenses', icon: Receipt, badge: null },
      { href: '/receipt-storage', label: 'Receipt Storage', icon: ImageIcon, badge: null },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/financial-reports', label: 'Financial Reports', icon: BarChart3, badge: null },
      { href: '/payroll-tax', label: 'Payroll', icon: Users, badge: null },
      { href: '/employee-management', label: 'Employees', icon: UsersRound, badge: null },
      { href: '/voucher-management', label: 'Voucher Management', icon: Ticket, badge: null },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onNavClick?: () => void;
}

export default function Sidebar({ collapsed, onToggle, onMouseEnter, onMouseLeave, onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, isOwner } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const isMobileSidebar = !collapsed && typeof onMouseEnter === 'undefined';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      setSigningOut(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel = profile?.role === 'owner' ? 'Owner' : profile?.role === 'accountant' ? 'Accountant' : 'Viewer';

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col z-40 sidebar-transition ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-border ${collapsed ? 'justify-center px-0 py-4' : 'px-4 py-4 gap-2'}`}>
        {collapsed ? (
          <Image
            src="/assets/images/istockphoto-1271371970-612x612-1789378855208.jpg"
            alt="Odinthor hammer logo"
            width={32}
            height={32}
            className="rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-bold text-lg tracking-tight text-foreground">Odin</span>
            <Image
              src="/assets/images/istockphoto-1271371970-612x612-1789378855208.jpg"
              alt="Odinthor hammer logo"
              width={28}
              height={28}
              className="rounded object-cover flex-shrink-0"
            />
            <span className="font-bold text-lg tracking-tight text-foreground">Thor</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {navGroups.map((group) => {
          const isOverview = group.label === 'Overview';
          const groupCollapsible = isMobileSidebar && isOverview;
          const groupVisible = !groupCollapsible || overviewOpen;
          return (
          <div key={`group-${group.label}`} className="mb-4">
            {!collapsed && (
              groupCollapsible ? (
                <button
                  type="button"
                  onClick={() => setOverviewOpen((v) => !v)}
                  aria-expanded={overviewOpen}
                  className="w-full flex items-center justify-between text-xs font-600 uppercase tracking-widest text-muted-foreground px-2 mb-1 py-1 rounded hover:bg-muted"
                >
                  <span>{group.label}</span>
                  <ChevronRight
                    size={14}
                    className={`transition-transform duration-200 ${overviewOpen ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <p className="text-xs font-600 uppercase tracking-widest text-muted-foreground px-2 mb-1">
                  {group.label}
                </p>
              )
            )}
            {groupVisible && group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={`nav-${item.href}`}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavClick}
                  className={`group relative flex items-center gap-3 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm flex-1 truncate">{item.label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}

        {/* Owner-only: User Management */}
        {isOwner() && (
          <div className="mb-4">
            {!collapsed && (
              <p className="text-xs font-600 uppercase tracking-widest text-muted-foreground px-2 mb-1 font-extrabold not-italic underline">
                Admin
              </p>
            )}
            <Link
              href="/user-management"
              title={collapsed ? 'User Management' : undefined}
              onClick={onNavClick}
              className={`group relative flex items-center gap-3 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150 ${
                pathname === '/user-management' ?'bg-primary/10 text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <UserCog size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm flex-1 truncate font-semibold">User Management</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  User Management
                </div>
              )}
            </Link>
            <Link
              href="/company-settings"
              title={collapsed ? 'Company Settings' : undefined}
              onClick={onNavClick}
              className={`group relative flex items-center gap-3 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150 ${
                pathname === '/company-settings' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Settings size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm flex-1 truncate font-semibold">Company Settings</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  Company Settings
                </div>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-0.5">
        <Link
          href="/alert-hub"
          title={collapsed ? 'Notifications' : undefined}
          onClick={onNavClick}
          className="group relative flex items-center gap-3 px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Bell size={18} />
          {!collapsed && <span className="text-sm">Notifications</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Notifications
            </div>
          )}
        </Link>
        <Link
          href="#"
          title={collapsed ? 'Settings' : undefined}
          onClick={onNavClick}
          className="group relative flex items-center gap-3 px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Settings size={18} />
          {!collapsed && <span className="text-sm">Settings</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Settings
            </div>
          )}
        </Link>
        <Link
          href="#"
          title={collapsed ? 'Help' : undefined}
          onClick={onNavClick}
          className="group relative flex items-center gap-3 px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <HelpCircle size={18} />
          {!collapsed && <span className="text-sm">Help & Support</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Help & Support
            </div>
          )}
        </Link>

        {!collapsed && (
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || 'Loading...'}</p>
              <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign out"
              className="flex-shrink-0 cursor-pointer text-muted-foreground hover:text-danger transition-colors disabled:opacity-50"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-sm hover:bg-muted transition-colors z-50"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}