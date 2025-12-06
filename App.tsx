
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Settings as SettingsIcon, Menu, X, ShieldAlert, Lock, FileText, MessageSquareText } from 'lucide-react';

import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { PlanList } from './components/PlanList';
import { Financials } from './components/Financials';
import { PayableList } from './components/PayableList';
import { Settings } from './components/Settings';
import { MessageTemplates } from './components/MessageTemplates';
import { storageService } from './services/storageService';
import { LicenseState, AppSettings } from './types';

// Countdown Hook
const useTrialTimer = (startDate: number) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const end = startDate + (3 * 24 * 60 * 60 * 1000); // 3 Days
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("00h:00m:00s");
        setIsExpired(true);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // If more than 24h, show days, else show HH:MM:SS
        const timeStr = days > 0 
           ? `${days}d ${hours}h ${minutes}m` 
           : `${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
        
        setTimeLeft(timeStr);
        setIsExpired(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  return { timeLeft, isExpired };
};

const Navigation = ({ isMobile, closeMenu, isLocked }: { isMobile?: boolean, closeMenu?: () => void, isLocked: boolean }) => {
  const location = useLocation();
  const baseClass = isMobile 
    ? "flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg mb-1" 
    : "flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg mb-1";
  
  const activeClass = "bg-blue-600 text-white shadow-lg shadow-blue-900/50";

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clientes', label: 'Clientes', icon: Users, locked: isLocked },
    { path: '/planos', label: 'Planos', icon: CreditCard, locked: isLocked },
    { path: '/contas-a-pagar', label: 'Contas a Pagar', icon: FileText, locked: isLocked },
    { path: '/financeiro', label: 'Vencimentos', icon: CreditCard, locked: isLocked },
    { path: '/mensagens', label: 'Mensagens Prontas', icon: MessageSquareText },
    { path: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
  ];

  return (
    <nav className="flex-1 px-2 py-4">
      {links.map(link => {
        const isActive = location.pathname === link.path;
        if (link.locked) return (
           <div key={link.path} className={`${baseClass} opacity-50 cursor-not-allowed group relative`}>
             <link.icon size={20} />
             <span>{link.label}</span>
             <Lock size={14} className="ml-auto"/>
           </div>
        );
        return (
          <Link 
            key={link.path} 
            to={link.path} 
            onClick={closeMenu}
            className={`${baseClass} ${isActive ? activeClass : ''}`}
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const AppContent = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [license, setLicense] = useState<LicenseState>(storageService.getLicense());
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const { timeLeft, isExpired } = useTrialTimer(license.trialStartDate);
  
  useEffect(() => {
    const handleStorage = () => {
       setLicense(storageService.getLicense());
       setSettings(storageService.getSettings());
    };
    
    // Standard storage event (cross-tab)
    window.addEventListener('storage', handleStorage);
    
    // Custom event (same-tab immediate update)
    window.addEventListener('settings-updated', handleStorage);

    const interval = setInterval(() => setLicense(storageService.getLicense()), 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('settings-updated', handleStorage);
      clearInterval(interval);
    }
  }, []);

  const isLocked = isExpired && !license.isActive;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           {settings.logo ? (
             <img src={settings.logo} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-md p-0.5" />
           ) : (
             <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-lg">
               {settings.companyName.charAt(0)}
             </div>
           )}
           <div>
             <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent leading-tight line-clamp-1 break-all">
               {settings.companyName}
             </h1>
             <p className="text-slate-400 text-[10px] uppercase tracking-wider">Gestão Inteligente</p>
           </div>
        </div>
        
        {/* Trial Timer Display in Sidebar */}
        {!license.isActive && (
          <div className={`mx-4 mt-4 p-3 rounded-lg border ${isLocked ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-blue-900/20 border-blue-500/50 text-blue-400'}`}>
             <div className="text-xs font-bold uppercase mb-1">Tempo de Teste</div>
             <div className="font-mono text-xl font-bold">{timeLeft}</div>
             {isLocked && <div className="text-xs mt-1">Licença Expirada</div>}
          </div>
        )}

        <Navigation isLocked={isLocked} />
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          v1.0.0
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <aside className="w-64 bg-slate-900 h-full p-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2">
                 {settings.logo && <img src={settings.logo} className="w-8 h-8 rounded bg-white p-0.5 object-contain" />}
                 <span className="font-bold text-lg line-clamp-1">{settings.companyName}</span>
               </div>
              <button onClick={() => setSidebarOpen(false)}><X/></button>
            </div>
            <Navigation isMobile closeMenu={() => setSidebarOpen(false)} isLocked={isLocked} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar Mobile */}
        <header className="md:hidden bg-white h-16 border-b flex items-center justify-between px-4 shadow-sm z-10">
           <button onClick={() => setSidebarOpen(true)} className="text-slate-600"><Menu/></button>
           <h1 className="font-bold text-slate-800 line-clamp-1">{settings.companyName}</h1>
           <div className="w-8"></div>
        </header>

        {/* Global Block Notice */}
        {isLocked && (
          <div className="bg-red-600 text-white p-2 text-center text-sm font-bold shadow-md z-20 flex items-center justify-center gap-2">
            <ShieldAlert size={16}/>
            PERÍODO DE TESTE EXPIRADO. ATIVE SUA LICENÇA PARA CONTINUAR USANDO.
          </div>
        )}

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route 
              path="/clientes" 
              element={isLocked ? <Navigate to="/configuracoes" replace /> : <ClientList />} 
            />
            <Route 
              path="/planos" 
              element={isLocked ? <Navigate to="/configuracoes" replace /> : <PlanList />} 
            />
             <Route 
              path="/contas-a-pagar" 
              element={isLocked ? <Navigate to="/configuracoes" replace /> : <PayableList />} 
            />
            <Route 
              path="/financeiro" 
              element={isLocked ? <Navigate to="/configuracoes" replace /> : <Financials />} 
            />
            <Route path="/mensagens" element={<MessageTemplates />} />
            <Route path="/configuracoes" element={<Settings />} />
            {/* Catch-all route to redirect to home if path doesn't exist */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
