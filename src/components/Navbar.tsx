import React, { useState } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  LayoutDashboard,
  History,
  BarChart3,
  BookOpen,
  User,
  LogOut,
  ChevronDown,
  BadgeCheck,
  Lock,
} from 'lucide-react';
import { InspectorUser } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onNewInspection: () => void;
  currentUser?: InspectorUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNewInspection,
  currentUser,
  onOpenLogin,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new_inspection', label: 'New Inspection', icon: PlusCircle },
    { id: 'history', label: 'Inspection Records', icon: History },
    { id: 'risk_intelligence', label: 'Risk Intelligence', icon: BarChart3 },
    { id: 'rule_database', label: 'Legal Metrology Rules', icon: BookOpen },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center space-x-2.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-500 transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold tracking-tight text-white">Aletiq</span>
                  <span className="text-[10px] uppercase font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                    SIH26034
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Packaged Commodity Compliance Intelligence
                </p>
              </div>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick CTA & Inspector Auth Controls */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onNewInspection}
              className="hidden sm:inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3.5 py-2 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start Inspection</span>
            </button>

            {/* Inspector Auth Status */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-emerald-700 text-emerald-100 flex items-center justify-center font-bold text-[11px]">
                    <BadgeCheck className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-[11px] font-semibold text-slate-100 leading-tight">
                      {currentUser.name}
                    </p>
                    <p className="text-[9px] text-emerald-400 font-mono">
                      {currentUser.badgeId}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <BadgeCheck className="w-3.5 h-3.5 inline text-emerald-600" />
                        <span>Active Inspector Session</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-600">{currentUser.designation}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{currentUser.zone}</p>
                    </div>

                    <div className="px-2 pt-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out of Inspector Portal</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium px-3 py-2 rounded-md transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Inspector</span> Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-800 space-x-1 scrollbar-none items-center justify-between">
          <div className="flex space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pl-2">
            <button
              onClick={onNewInspection}
              className="inline-flex items-center space-x-1 bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

