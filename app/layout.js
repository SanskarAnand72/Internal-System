import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import AIPanel from '@/components/AIPanel';
import Toast from '@/components/Toast';
import CommandPalette from '@/components/CommandPalette';
import EmailPreviewModal from '@/components/EmailPreviewModal';
import ScrollRestorer from '@/components/ScrollRestorer';
import PageTransition from '@/components/PageTransition';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Internal System — AI Command Center',
  description: 'Internal AI Command Center for internal system operations. Manage multiple client recovery campaigns from one mission-control dashboard.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SessionProviderWrapper>
          <AppProvider>
          {/* Fixed 3-column shell — sidebar | main | ai-panel */}
          <div className="app-shell">
            {/* ─── Fixed Sidebar ─── */}
            <Sidebar />

            {/* ─── Main Column (topbar sticky + content scrolls) ─── */}
            <main className="main-content" id="main-content">
              <Topbar />
              <div className="content-scroll">
                <PageTransition>
                  {children}
                </PageTransition>
                <div style={{ height: '60px' }} />
              </div>
            </main>

            {/* ─── Fixed AI Copilot Panel ─── */}
            <AIPanel />
          </div>

          {/* Global Overlays */}
          <CommandPalette />
          <EmailPreviewModal />
          <Toast />
          <ScrollRestorer />
          </AppProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
