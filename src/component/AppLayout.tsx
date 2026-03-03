// src/components/AppLayout.tsx

import { JSX, useState, type ReactNode } from 'react';
import {
  Outlet,
  NavLink,
  useNavigate,
  type NavLinkProps,
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
  X,
  Swords,
  Radio,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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


// ─────────────────────────────────────────────
// Nav Definitions
// ─────────────────────────────────────────────

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


// ─────────────────────────────────────────────
// Sidebar Content
// ─────────────────────────────────────────────

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
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
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
                color: isAdmin
                  ? 'var(--gold)'
                  : 'var(--text-muted)',
              }}
            >
              {userProfile?.role ?? 'Member'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: 10 }}
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// Sidebar Link
// ─────────────────────────────────────────────

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
        padding: '9px 10px',
        borderRadius: 9,
        marginBottom: 3,
        textDecoration: 'none',
        fontSize: 14,
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
              accent
                ? 'rgba(240,165,0,.2)'
                : 'var(--border)'
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

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────

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


// ─────────────────────────────────────────────
// Main Layout
// ─────────────────────────────────────────────

export default function AppLayout(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Desktop Sidebar */}
      <aside
        style={{
          width: 220,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          height: '100vh',
        }}
        className="sidebar-desktop"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            background: 'rgba(8,12,18,.96)',
          }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}