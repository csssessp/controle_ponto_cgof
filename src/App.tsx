import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { 
  FileUp, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Search,
  Moon,
  Sun,
  LayoutDashboard,
  Clock,
  Upload as UploadIcon,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useAppStore } from '@/src/lib/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import Upload from './pages/Upload';
import Employees from './pages/Employees';
import TimeCard from './pages/TimeCard';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';


const queryClient = new QueryClient();

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { profile, signOut } = useAuthStore();
  const location = useLocation();

  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPw, setNewPw]               = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [showNewPw, setShowNewPw]       = useState(false);
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwError, setPwError]           = useState<string | null>(null);
  const [pwOk, setPwOk]                 = useState(false);

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) { setPwError("Senha deve ter ao menos 6 caracteres."); return; }
    if (newPw !== newPwConfirm) { setPwError("As senhas não coincidem."); return; }
    setPwLoading(true); setPwError(null);
    try {
      const { supabase: sb } = await import('@/src/lib/supabase');
      const { error } = await sb.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwOk(true);
      setTimeout(() => { setChangePwOpen(false); setPwOk(false); setNewPw(""); setNewPwConfirm(""); }, 1800);
    } catch (err: any) {
      setPwError(err?.message ?? "Erro ao alterar senha.");
    } finally {
      setPwLoading(false);
    }
  }

  const navItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Espelho de Ponto', path: '/ponto', icon: Calendar },
    { title: 'Funcionários', path: '/employees', icon: Users },
    { title: 'Upload Ponto', path: '/upload', icon: FileUp },
    { title: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <>
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 80 }}
      className={cn(
        "fixed left-0 top-0 h-full bg-[#0f2044] border-r border-white/10 z-50 flex flex-col shadow-xl",
        "transition-all duration-300 ease-in-out"
      )}
    >
      <div className={cn("h-20 flex items-center border-b border-white/10 shrink-0", sidebarOpen ? "px-4 justify-between" : "justify-center")}>
        <Link to="/ponto" className={cn("flex items-center h-full", sidebarOpen ? "min-w-0 py-1" : "p-1")}>
          <img
            src="/img/logo1.png"
            alt="CGOF"
            className={cn("object-contain transition-all", sidebarOpen ? "h-[72px] w-auto max-w-[220px]" : "w-16 h-16")}
          />
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center h-12 rounded-xl transition-all group relative px-4",
                isActive 
                  ? "bg-white/10 text-white border border-white/20" 
                  : "hover:bg-white/5 text-white/60 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 min-w-[20px]", !sidebarOpen && "mx-auto", isActive ? "text-white" : "text-white/50")} />
              {sidebarOpen && (
                <span className="ml-3 font-medium text-sm transition-opacity duration-200">
                  {item.title}
                </span>
              )}
              {!sidebarOpen && (
                <div className="absolute left-16 bg-[#1a3a6b] text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-md z-50 border border-white/10">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        {sidebarOpen && (
          <div className="flex items-center gap-3 px-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
              <Users className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold truncate text-white">{profile?.email?.split("@")[0] ?? "Usuário"}</p>
              <p className="text-[10px] text-white/40 truncate">{profile?.role ?? "CGOF"}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5" onClick={() => { setChangePwOpen(true); setPwError(null); setPwOk(false); setNewPw(""); setNewPwConfirm(""); }}>
          <KeyRound className="w-4 h-4 mr-2" />
          {sidebarOpen && <span>Alterar Senha</span>}
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-white/5" onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          {sidebarOpen && <span>Sair</span>}
        </Button>
      </div>
    </motion.aside>

    {/* ── Change Password Modal ── */}
    {changePwOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setChangePwOpen(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-base text-gray-800">Alterar Senha</h2>
            </div>
            <button onClick={() => setChangePwOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {pwOk ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p className="font-semibold text-gray-800">Senha alterada com sucesso!</p>
            </div>
          ) : (
            <form onSubmit={handleChangePw} noValidate>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      disabled={pwLoading}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmar Senha</label>
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPwConfirm}
                    onChange={e => setNewPwConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    disabled={pwLoading}
                  />
                </div>
              </div>
              {pwError && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{pwError}</div>
              )}
              <div className="flex gap-2 mt-5">
                <button type="button" onClick={() => setChangePwOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={pwLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                  {pwLoading ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </>
  );
}

function Topbar() {
  const { toggleSidebar } = useAppStore();
  const { lastUpload } = useAppStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <header className="h-16 border-b border-white/10 bg-[#0f2044] sticky top-0 z-40 px-6 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white/70 hover:text-white hover:bg-white/10">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden md:flex flex-col leading-tight">
          <span className="text-white font-bold text-sm tracking-wide">Controle de Ponto CGOF</span>
          <span className="text-white/50 text-[10px] uppercase tracking-widest">Coordenadoria de Gestão Orçamentária e Financeira</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Last upload info */}
        {lastUpload && (
          <div className="hidden md:flex items-center gap-2 text-white/60 text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <UploadIcon className="w-3 h-3 shrink-0" />
            <span>Atualizado: <span className="text-white/80 font-medium">{lastUpload}</span></span>
          </div>
        )}

        {/* Date/Time clock */}
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-white font-mono text-sm font-bold">{timeStr}</span>
          <span className="text-white/50 text-[10px] capitalize">{dateStr}</span>
        </div>

        <div className="h-8 w-[1px] bg-white/10 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            document.documentElement.classList.toggle('dark');
          }}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

      </div>
    </header>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();
  
  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar />
      <main 
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent",
          sidebarOpen ? "ml-[260px]" : "ml-[80px]"
        )}
      >
        <Topbar />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <React.Suspense fallback={<div className="p-8"><div className="w-full h-64 rounded-3xl bg-accent animate-pulse" /></div>}>
                {children}
              </React.Suspense>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  if (!profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setProfile } = useAuthStore();

  // Rehydrate session on mount
  useEffect(() => {
    import('@/src/lib/supabase').then(({ supabase }) => {
      if (!supabase) { useAuthStore.getState().setProfile(null); return; }
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user ?? null;
        if (user) {
          setProfile({
            id:              user.id,
            email:           user.email ?? "",
            role:            (user.app_metadata?.system_role ?? user.app_metadata?.role ?? "VIEWER") as any,
            organization_id: user.app_metadata?.organization_id ?? "",
            employee_id:     user.app_metadata?.employee_id,
          });
        } else {
          setProfile(null);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        if (user) {
          setProfile({
            id:              user.id,
            email:           user.email ?? "",
            role:            (user.app_metadata?.system_role ?? user.app_metadata?.role ?? "VIEWER") as any,
            organization_id: user.app_metadata?.organization_id ?? "",
            employee_id:     user.app_metadata?.employee_id,
          });
        } else {
          setProfile(null);
        }
      });
      return () => subscription.unsubscribe();
    });
  }, [setProfile]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><MainLayout><DashboardPage /></MainLayout></RequireAuth>} />
          <Route path="/upload" element={<RequireAuth><MainLayout><Upload /></MainLayout></RequireAuth>} />
          <Route path="/employees" element={<RequireAuth><MainLayout><Employees /></MainLayout></RequireAuth>} />
          <Route path="/ponto" element={<RequireAuth><MainLayout><TimeCard /></MainLayout></RequireAuth>} />
          <Route path="/users" element={<RequireAuth><MainLayout><UsersPage /></MainLayout></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><MainLayout><SettingsPage /></MainLayout></RequireAuth>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
