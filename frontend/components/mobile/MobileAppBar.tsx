import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, User } from 'lucide-react';
import { useStore } from '../../store';

export const MobileAppBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const toggleMobileDrawer = (useStore as any).getState().toggleMobileDrawer;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border flex items-center justify-between px-4 z-40 md:hidden">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => toggleMobileDrawer?.()}
          className="p-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary active:bg-[#3f3f3f] transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight">
            Hi, {user?.first_name || user?.name?.split(" ")[0] || user?.username || 'there'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={() => navigate('/search')}
          className="p-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary active:bg-[#3f3f3f] transition-colors"
        >
          <Search size={22} />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 bg-[#2f2f2f] rounded-full flex items-center justify-center text-[10px] font-bold border border-border overflow-hidden ml-1"
        >
          {user?.first_name?.charAt(0) || user?.username?.charAt(0) || <User size={16} />}
        </button>
      </div>
    </header>
  );
};
