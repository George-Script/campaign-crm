import { JSX, useState, useEffect } from 'react';
import {
  Outlet,
  NavLink,
  useNavigate,
  NavLinkRenderProps,
} from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  LayoutDashboard,
  Users,
  UserPlus,
  Shield,
  Home,
  LogOut,
  Menu,
  Swords,
  Radio,
  Megaphone,
  type LucideIcon,
  Sun,
  Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────────────────────────────────────────── */
/* Types */
/* ───────────────────────────────────────────── */

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarContentProps {
  onNavigate?: () => void;
}

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}

interface AvatarProps {
  name?: string;
  index?: number;
  size?: number;
}

/* ───────────────────────────────────────────── */
/* Nav Definitions */
/* ───────────────────────────────────────────── */

const MEMBER_NAV: NavItem[] = [
  { to: '/home', icon: Home, label: 'My Home' },
  { to: '/campaign', icon: Swords, label: 'Campaign Journey' },
  { to: '/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/announcements', icon: Megaphone, label: 'Team Board' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/add-contact', icon: UserPlus, label: 'Add Contact' },
];

const ADMIN_EXTRA: NavItem[] = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/team', icon: Shield, label: 'Team' },
];

/* ───────────────────────────────────────────── */
/* Sidebar Content */
/* ───────────────────────────────────────────── */

function SidebarContent({ onNavigate }: SidebarContentProps): JSX.Element {
  const { userProfile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div
        style={{
          padding: '22px 18px 18px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                'linear-gradient(135deg,var(--gold),var(--gold-dim))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={17} color="#080C12" strokeWidth={2.5} />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              SPETS
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontWeight: 700,
                letterSpacing: '.08em',
              }}
            >
              CAMPAIGN CRM
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {MEMBER_NAV.map(({ to, icon, label }) => (
          <SidebarLink
            key={to}
            to={to}
            icon={icon}
            label={label}
            onClick={onNavigate}
          />
        ))}

        {isAdmin && (
          <>
            <div
              style={{
                padding: '8px 8px 4px',
                fontSize: 10,
                color: 'var(--text-muted)',
                fontWeight: 700,
                letterSpacing: '.1em',
              }}
            >
              ADMIN
            </div>

            {ADMIN_EXTRA.map(({ to, icon, label }) => (
              <SidebarLink
                key={to}
                to={to}
                icon={icon}
                label={label}
                onClick={onNavigate}
                accent
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '14px 12px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={userProfile?.name} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {userProfile?.name ?? 'Member'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: isAdmin ? 'var(--gold)' : 'var(--text-muted)',
              }}
            >
              {userProfile?.role ?? 'Member'}
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="btn btn-ghost btn-sm">
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Sidebar Link */
/* ───────────────────────────────────────────── */

function SidebarLink({
  to,
  icon: Icon,
  label,
  onClick,
  accent = false,
}: SidebarLinkProps): JSX.Element {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }: NavLinkRenderProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '12px 12px',
        borderRadius: 9,
        marginBottom: 3,
        textDecoration: 'none',
        fontSize: 15,
        fontWeight: isActive ? 600 : 400,
        color: isActive
          ? accent
            ? 'var(--gold)'
            : 'var(--text-primary)'
          : 'var(--text-secondary)',
        background: isActive
          ? accent
            ? 'var(--gold-glow)'
            : 'var(--bg-raised)'
          : 'transparent',
        border: isActive
          ? `1px solid ${
              accent ? 'rgba(240,165,0,.2)' : 'var(--border)'
            }`
          : '1px solid transparent',
        transition: 'all .15s',
      })}
    >
      <Icon size={15} />
      {label}
    </NavLink>
  );
}

/* ───────────────────────────────────────────── */
/* Avatar */
/* ───────────────────────────────────────────── */

export function Avatar({
  name = '?',
  index = 0,
  size = 28,
}: AvatarProps): JSX.Element {
  const GRAD: [string, string][] = [
    ['#F0A500', '#C8860A'],
    ['#00D084', '#00A567'],
    ['#3B82F6', '#6366F1'],
    ['#8B5CF6', '#EC4899'],
    ['#FF4D6D', '#F97316'],
    ['#06B6D4', '#3B82F6'],
  ];

  const [a, b] = GRAD[index % GRAD.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg,${a},${b})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: '#fff',
      }}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* App Layout */
/* ───────────────────────────────────────────── */

export default function AppLayout(): JSX.Element {
  const DESKTOP_BREAKPOINT = 900;
  const SIDEBAR_WIDTH = 240;

  const [isDesktop, setIsDesktop] = useState(
    window.innerWidth >= DESKTOP_BREAKPOINT
  );

  const [sidebarOpen, setSidebarOpen] = useState(
    window.innerWidth >= DESKTOP_BREAKPOINT
  );

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  /* Resize */
  useEffect(() => {
    function handleResize() {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Theme Init */
  useEffect(() => {
    const savedTheme = localStorage.getItem('spets-theme') as
      | 'dark'
      | 'light'
      | null;

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersLight = window.matchMedia(
        '(prefers-color-scheme: light)'
      ).matches;

      const initialTheme = prefersLight ? 'light' : 'dark';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('spets-theme', newTheme);
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-base)',
      }}
    >
      {/* Mobile Overlay */}
      {!isDesktop && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen || isDesktop ? SIDEBAR_WIDTH : 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
          transition: 'width .3s ease',
          height: '100vh',
          position: isDesktop ? 'sticky' : 'fixed',
          top: 0,
          zIndex: 50,
          transform:
            !isDesktop && !sidebarOpen
              ? 'translateX(-100%)'
              : 'translateX(0)',
        }}
      >
        {(sidebarOpen || isDesktop) && (
          <SidebarContent
            onNavigate={() => {
              if (!isDesktop) setSidebarOpen(false);
            }}
          />
        )}
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <header
          style={{
            height: 56,
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center'}}>
            {/* Hamburger + Mobile-only text */}
            {!isDesktop && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {/* Hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="btn btn-ghost btn-sm"
                >
                  <Menu size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile-only text */}
          <div
            style={{
              fontWeight: 600,
              flex: 1,
              textAlign: 'center',
              display: 'block',
            }}
            className="topbar-title"
          >
            SPETS CRM
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}