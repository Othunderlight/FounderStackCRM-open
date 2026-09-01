import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, CheckSquare, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MobileNavigationBar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/people/all', icon: Users, label: 'People' },
    { to: '/tasks/all', icon: CheckSquare, label: 'Tasks' },
    { to: '/analytics/pre-sales', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background border-t border-border flex items-center justify-around px-2 z-40 md:hidden pb-safe-area-inset-bottom">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to.split('/all')[0]));
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive: linkActive }) => cn(
              "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
              isActive ? "text-accent font-semibold" : "text-textSecondary"
            )}
          >
            <div className={cn(
              "w-12 h-8 flex items-center justify-center rounded-full transition-all duration-200",
              isActive ? "bg-accent/15" : "hover:bg-[#2f2f2f]/50"
            )}>
              <item.icon size={22} className={cn(isActive ? "text-accent" : "text-textSecondary")} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
