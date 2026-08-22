import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LiveNotifications } from './components/LiveNotifications';
import { HomePage } from './pages/HomePage';
import { AllToolsPage } from './pages/AllToolsPage';
import { ToolDetailPage } from './pages/ToolDetailPage';
import { PlansPage } from './pages/PlansPage';
import { ResellerPage } from './pages/ResellerPage';
import { FaqPage } from './pages/FaqPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LegalPage } from './pages/LegalPage';
import { LoginPage } from './pages/LoginPage';
import { AdminApp } from './admin/AdminApp';
import { ResellerApp } from './reseller/ResellerApp';
import { PromoPopup } from './components/PromoPopup';

// ── Root router — ALL hooks called unconditionally ────────────────────────
export default function App() {
  // All hooks must be at top level, no conditionals before them
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
    );
  };

  // ── /admin → completely separate panel, no public chrome ─────────────────
  if (currentPath.startsWith('/admin')) {
    return <AdminApp />;
  }

  // ── /reseller → separate reseller panel, no public chrome ────────────────
  // Must not swallow the public /resellers-portal marketing page.
  if (currentPath === '/reseller' || currentPath.startsWith('/reseller/')) {
    return <ResellerApp />;
  }

  // ── Public site ──────────────────────────────────────────────────────────
  const renderPage = () => {
    const path = currentPath;

    if (path.startsWith('/tools/') && path.length > 7) {
      const slug = path.replace('/tools/', '').split('?')[0];
      return <ToolDetailPage slug={slug} onNavigate={handleNavigate} />;
    }
    if (path === '/' || path === '') return <HomePage onNavigate={handleNavigate} favorites={favorites} onToggleFavorite={handleToggleFavorite} />;
    if (path === '/tools' || path === '/shop') return <AllToolsPage onNavigate={handleNavigate} favorites={favorites} onToggleFavorite={handleToggleFavorite} />;
    if (path === '/plans') return <PlansPage onNavigate={handleNavigate} />;
    if (path === '/resellers-portal') return <ResellerPage />;
    if (path === '/login' || path === '/signup') return <LoginPage onNavigate={handleNavigate} />;
    if (path === '/faq') return <FaqPage />;
    if (path === '/about') return <AboutPage onNavigate={handleNavigate} />;
    if (path === '/contact') return <ContactPage />;
    if (path === '/privacy-policy') return <LegalPage type="privacy" onNavigate={handleNavigate} />;
    if (path === '/terms-of-service' || path === '/terms') return <LegalPage type="terms" onNavigate={handleNavigate} />;
    if (path === '/sitemap') return <LegalPage type="sitemap" onNavigate={handleNavigate} />;
    return <HomePage onNavigate={handleNavigate} favorites={favorites} onToggleFavorite={handleToggleFavorite} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-red-600 selection:text-white">
      <Header
        currentPath={currentPath}
        onNavigate={handleNavigate}
        favorites={favorites}
      />
      <main className="flex-1">{renderPage()}</main>
      <Footer onNavigate={handleNavigate} />
      <LiveNotifications />
      <PromoPopup />
    </div>
  );
}
