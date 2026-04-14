import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/contexts/AuthContext';
import { GraphProvider } from '@/contexts/GraphContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import HomePage from '@/features/home/HomePage';
import NewsDetailPage from '@/features/home/NewsDetailPage';
import EventDetailPage from '@/features/home/EventDetailPage';
import HistoryDetailPage from '@/features/home/HistoryDetailPage';
import LiteratureDetailPage from '@/features/home/LiteratureDetailPage';
import PersonListPage from '@/features/person/PersonListPage';
import FamilyChart from '@/features/chart/FamilyChartSwitcher';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/global.css';

function NavBar() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/chart', label: t('nav.chart') },
    { path: '/members', label: t('nav.members') },
    { path: '/admin', label: t('nav.admin') },
  ];

  return (
    <nav className="flex items-center px-5 h-14 bg-background border-b gap-5">
      <Link to="/" className="no-underline">
        <strong className="text-lg">आचार्यमूल</strong>
      </Link>
      <div className="flex gap-1 flex-1">
        {navItems.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`px-3.5 py-1.5 rounded-md no-underline text-sm transition-colors ${location.pathname === path ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent'}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={toggleLanguage}>
        {language === 'en' ? 'नेपाली' : 'English'}
      </Button>
    </nav>
  );
}

function AppRoutes() {
  return (
    <>
      <NavBar />
      <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/history/:slug" element={<HistoryDetailPage />} />
          <Route path="/literature/:slug" element={<LiteratureDetailPage />} />
          <Route path="/chart" element={<FamilyChart />} />
          <Route path="/members" element={<PersonListPage />} />
          <Route path="/admin" element={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground text-lg">Admin Panel (Story 7.1)</div>} />
          <Route path="/my-contributions" element={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground text-lg">My Contributions (Story 6.5)</div>} />
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
