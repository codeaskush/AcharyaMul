import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GraphProvider } from '@/contexts/GraphContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';
import HomePage from '@/features/home/HomePage';
import NewsDetailPage from '@/features/home/NewsDetailPage';
import EventDetailPage from '@/features/home/EventDetailPage';
import HistoryDetailPage from '@/features/home/HistoryDetailPage';
import LiteratureDetailPage from '@/features/home/LiteratureDetailPage';
import PersonListPage from '@/features/person/PersonListPage';
import FamilyChart from '@/features/chart/FamilyChartSwitcher';
import LoginPage from '@/features/auth/LoginPage';
import AdminPage from '@/features/admin/AdminPage';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/global.css';

// Route guard — redirects to /login if not authenticated
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}

function NavBar() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/chart', label: t('nav.chart'), auth: true },
    { path: '/members', label: t('nav.members'), auth: true },
  ];

  // Admin panel is shown as a separate button on the right, not in the nav list

  return (
    <nav className="flex items-center px-5 h-14 bg-background border-b gap-5">
      <Link to="/" className="no-underline">
        <strong className="text-lg">आचार्यमूल</strong>
      </Link>
      <div className="flex gap-1 flex-1">
        {navItems.map(({ path, label, auth }) => {
          // Hide auth-required links if not logged in
          if (auth && !user) return null;
          return (
            <Link
              key={path}
              to={path}
              className={`px-3.5 py-1.5 rounded-md no-underline text-sm transition-colors ${location.pathname === path ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent'}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={toggleLanguage}>
        {language === 'en' ? 'नेपाली' : 'English'}
      </Button>
      {user && (
        <div className="flex items-center gap-2.5">
          {user.role === 'admin' && (
            <Button asChild variant="outline" size="sm" className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user.display_name || user.email}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title={t('nav.logout')}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
      {!user && (
        <Button asChild size="sm">
          <Link to="/login">{t('nav.login')}</Link>
        </Button>
      )}
    </nav>
  );
}

function AppRoutes() {
  return (
    <>
      <NavBar />
      <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/history/:slug" element={<HistoryDetailPage />} />
          <Route path="/literature/:slug" element={<LiteratureDetailPage />} />

          {/* Authenticated routes */}
          <Route path="/chart" element={<ProtectedRoute><FamilyChart /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><PersonListPage /></ProtectedRoute>} />
          <Route path="/my-contributions" element={
            <ProtectedRoute>
              <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground text-lg">My Contributions (Story 6.5)</div>
            </ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
        </Routes>
      </main>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <GraphProvider>
            <AppRoutes />
          </GraphProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
