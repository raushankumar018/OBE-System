import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, GitBranch, BarChart3,
  History, LogOut, ChevronRight, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/course/new', icon: BookOpen, label: 'New Course' },
  { to: '/history', icon: History, label: 'Reports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-ink flex">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/[0.06] relative z-10">
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-ink" />
            </div>
            <div>
              <p className="font-display font-bold text-paper text-sm leading-none">OBE System</p>
              <p className="text-paper/30 text-xs mt-0.5 font-body">Vignan's University</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-paper/25 text-[10px] font-display font-bold tracking-widest uppercase px-3 py-2">
            Workspace
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-200 group ${
                  isActive
                    ? 'bg-accent text-ink font-medium'
                    : 'text-paper/50 hover:text-paper hover:bg-white/[0.05]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-ink' : 'text-paper/40 group-hover:text-paper/70'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} className="text-ink/50" />}
                </>
              )}
            </NavLink>
          ))}

          <p className="text-paper/25 text-[10px] font-display font-bold tracking-widest uppercase px-3 py-2 pt-5">
            Workflow
          </p>
          {[
            { to: '/course/new', icon: BookOpen, label: '1. Generate COs' },
            { label: '2. Review & Map', icon: GitBranch, to: '/history' },
            { label: '3. Attainment', icon: BarChart3, to: '/history' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={label}
              to={to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-body text-paper/35 hover:text-paper/60 transition-all"
            >
              <Icon size={14} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg glass mb-2">
            <img
              src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=D4FF3C&color=0A0A0F`}
              alt={user?.name}
              className="w-7 h-7 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-paper text-xs font-medium font-body truncate">{user?.name}</p>
              <p className="text-paper/35 text-[10px] truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-paper/35 hover:text-danger hover:bg-danger/10 text-xs font-body transition-all"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
