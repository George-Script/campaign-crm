import type { JSX, ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import AppLayout from './component/AppLayout';
import LoginPage from './pages/LoginPage';
import MemberHomePage from './pages/MemberHomePage';
import ContactsPage from './pages/ContactsPage';
import AddContactPage from './pages/AddContactPage';
import AdminDashboard from './pages/AdminDashboard';
import TeamPage from './pages/TeamPage';
import CampaignJourneyPage from './pages/CampaignJourneyPage';
import BroadcastPage from './pages/BroadcastPage';
import AnnouncementsPage from './pages/AnnouncementsPage';

/* ───────────────────────────────────────────── */
/* Spinner Component */
/* ───────────────────────────────────────────── */
function Spinner(): JSX.Element {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Guards */
/* ───────────────────────────────────────────── */
interface GuardProps {
  children: ReactElement;
}

function RequireAuth({ children }: GuardProps): JSX.Element {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) return <Spinner />;

  if (!currentUser) return <Navigate to="/login" replace />;

  return children;
}

function RequireAdmin({ children }: GuardProps): JSX.Element {
  const { currentUser, isAdmin, authLoading } = useAuth();

  if (authLoading) return <Spinner />;

  // If not logged in or not admin, redirect to login
  if (!currentUser || !isAdmin) return <Navigate to="/login" replace />;

  return children;
}

/* ───────────────────────────────────────────── */
/* Default Redirect After Login */
/* ───────────────────────────────────────────── */
function DefaultRedirect(): ReactElement {
  const { isAdmin, authLoading } = useAuth();

  if (authLoading) return <Spinner />;

  return <Navigate to={isAdmin ? '/admin/dashboard' : '/home'} replace />;
}

/* ───────────────────────────────────────────── */
/* Route Tree */
/* ───────────────────────────────────────────── */
function AppRoutes(): ReactElement {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) return <Spinner />;

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={currentUser ? <DefaultRedirect /> : <LoginPage />}
      />

      {/* Protected Layout */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DefaultRedirect />} />

        {/* Member routes */}
        <Route path="home" element={<MemberHomePage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="add-contact" element={<AddContactPage />} />

        {/* Campaign routes */}
        <Route path="campaign" element={<CampaignJourneyPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />

        {/* Admin-only routes */}
        <Route
          path="admin/dashboard"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/team"
          element={
            <RequireAdmin>
              <TeamPage />
            </RequireAdmin>
          }
        />
      </Route>

      {/* Catch-all for unauthorized or invalid URLs */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ───────────────────────────────────────────── */
/* App Root */
/* ───────────────────────────────────────────── */
export default function App(): ReactElement {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}