import React from 'react';
import {
  Map,
  Users,
  MessageSquare,
  Flag,
  Target,
  ShieldAlert,
  Radio,
  Route,
  Settings,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';

export type ActiveTab =
  | 'map'
  | 'team'
  | 'messages'
  | 'checkpoints'
  | 'missions'
  | 'emergency'
  | 'intel'
  | 'routes'
  | 'settings';

interface AppSidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange }) => {
  const { messages, emergencies } = useTeam();

  const activeEmergenciesCount = emergencies.filter((e) => e.status !== 'RESOLVED').length;
  const unreadMessagesCount = 2; // matches screenshot

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: any;
    badge?: number;
    badgeColor?: string;
  }

  const navItems: NavItem[] = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'team', label: 'Team', icon: Users },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { id: 'checkpoints', label: 'Checkpoints', icon: Flag },
    { id: 'missions', label: 'Missions', icon: Target },
    {
      id: 'emergency',
      label: 'Emergency',
      icon: ShieldAlert,
      badge: activeEmergenciesCount > 0 ? activeEmergenciesCount : undefined,
      badgeColor: 'bg-red-600',
    },
    { id: 'intel', label: 'Intel & Alerts', icon: Radio },
    { id: 'routes', label: 'Route Planner', icon: Route },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col justify-between select-none shrink-0 min-h-full">
      {/* Navigation List */}
      <nav className="p-3 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white leading-none ${
                    item.badgeColor || 'bg-red-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mountain Graphic Footer (Matches screenshot) */}
      <div className="p-3">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-700 to-slate-900 text-white p-4 shadow-sm border border-slate-700/60">
          {/* Subtle stylized mountains silhouette SVG backdrop */}
          <svg
            className="absolute inset-0 w-full h-full opacity-20 pointer-events-none object-cover"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <polygon points="0,120 40,50 80,90 120,30 160,80 200,40 200,120" fill="#FFFFFF" />
            <polygon points="0,120 30,70 70,110 110,60 150,100 200,70 200,120" fill="#93C5FD" opacity="0.5" />
          </svg>

          <div className="relative z-10">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-200 leading-snug">
              FOR A<br />
              SAFER<br />
              TOMORROW
            </p>
            <div className="mt-2 text-lg">🇮🇳</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
