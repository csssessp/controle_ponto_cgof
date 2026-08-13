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
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Search,
  Moon,
  Sun,
  LayoutDashboard,
  Clock,
  Upload as UploadIcon,
  KeyRound,
  Eye,
  EyeOff,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore, useAppStore } from '@/src/lib/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import Upload from './pages/Upload';
import Employees from './pages/Employees';
import TimeCard from './pages/TimeCard';
import SettingsPage from './pages/Settings';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import PinProject from './pages/PinProject';


const queryClient = new QueryClient();

/** Modal de troca de senha — usado a partir do menu de conta no Topbar
 *  (única entrada de ações de conta, ver UserMenu). */
function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [newPw, setNewPw]               = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [showNewPw, setShowNewPw]       = useState(false);
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwError, setPwError]           = useState<string | null>(null);
  const [pwOk, setPwOk]                 = useState(false);

  useEffect(() => {
    if (open) { setNewPw(""); setNewPwConfirm(""); setPwError(null); setPwOk(false); }
  }, [open]);

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
      setTimeout(() => onOpenChange(false), 1800);
    } catch (err: any) {
      setPwError(err?.message ?? "Erro ao alterar senha.");
    } finally {
      setPwLoading(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-gray-800">Alterar Senha</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                    autoFocus
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
              <button type="button" onClick={() => onOpenChange(false)}
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
  );
}

/** Menu de conta — avatar no Topbar, único lugar com ações de conta (troca
 *  de senha / sair). Substitui o antigo bloco fixo no rodapé da sidebar,
 *  que ficava desalinhado e criava um vão vazio enorme em contas com pouca
 *  navegação (ex: acesso self-service de funcionário, só 1 item de menu). */
function UserMenu() {
  const { profile, signOut } = useAuthStore();
  const [changePwOpen, setChangePwOpen] = useState(false);
  const initial = (profile?.email?.[0] ?? "U").toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white font-bold text-sm transition-colors outline-none"
        >
          {initial}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="w-56">
          <div className="px-1.5 py-1.5">
            <p className="text-sm font-semibold truncate">{profile?.email ?? "Usuário"}</p>
            <p className="text-xs font-normal text-muted-foreground">{profile?.role ?? "CGOF"}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setChangePwOpen(true)}>
            <KeyRound className="w-4 h-4 mr-2" /> Alterar Senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut()} className="text-red-600 focus:text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={changePwOpen} onOpenChange={setChangePwOpen} />
    </>
  );
}

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { profile } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Espelho de Ponto', path: '/ponto', icon: Calendar },
    { title: 'Funcionários', path: '/employees', icon: Users },
    { title: 'Saldos Acumulados', path: '/pin', icon: Target },
    { title: 'Upload Ponto', path: '/upload', icon: FileUp },
    { title: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop — em telas pequenas, expandir a sidebar sobrepõe o conteúdo
          (overlay) em vez de empurrá-lo; clicar fora recolhe de novo. */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={toggleSidebar} />
      )}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 84 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-full bg-[#0f2044] border-r border-white/10 z-50 flex flex-col shadow-xl overflow-hidden"
      >
        {/* Recolher/expandir + nome institucional — o brasão aparece só uma vez,
            no cabeçalho principal (Topbar); aqui é só texto, pra não duplicar
            a marca. */}
        <div className={cn(
          "shrink-0 h-16 flex items-center border-b border-white/10",
          sidebarOpen ? "px-3 gap-3" : "justify-center px-0"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30 shrink-0"
            title={sidebarOpen ? "Recolher menu" : "Expandir menu"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-[19px] h-[19px]" /> : <PanelLeftOpen className="w-[19px] h-[19px]" />}
          </Button>
          {sidebarOpen && (
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-bold text-white truncate">Controle de Ponto</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider truncate">CGOF</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center h-12 rounded-xl transition-colors duration-200 group relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                  sidebarOpen ? "px-3" : "justify-center px-0",
                  sidebarOpen && isActive && "bg-white/12",
                  !isActive && "hover:bg-white/5"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center shrink-0 rounded-lg transition-colors duration-200",
                  !sidebarOpen && "w-10 h-10",
                  !sidebarOpen && isActive && "bg-white/12"
                )}>
                  <item.icon
                    className={cn("w-[22px] h-[22px]", isActive ? "text-white" : "text-white/55 group-hover:text-white")}
                    strokeWidth={2}
                  />
                </span>
                {sidebarOpen && (
                  <span className={cn("ml-3 text-sm truncate", isActive ? "font-semibold text-white" : "font-medium text-white/70 group-hover:text-white")}>
                    {item.title}
                  </span>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-3 bg-[#1a3a6b] text-white px-2.5 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-lg z-50 border border-white/10">
                    {item.title}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn("shrink-0 px-4 py-3 border-t border-white/10 text-[10px] text-white/30 font-semibold uppercase tracking-wider", !sidebarOpen && "text-center px-0")}>
          {sidebarOpen ? (profile?.role ?? "CGOF") : "•"}
        </div>
      </motion.aside>
    </>
  );
}

function Topbar() {
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
        <Link to="/ponto" className="flex items-center h-14 shrink-0">
          <img
            src="/img/BRASAO-3-texto-branco.png"
            alt="CGOF"
            className="object-contain h-14 w-auto"
          />
        </Link>
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

        <UserMenu />
      </div>
    </header>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();
  const { profile } = useAuthStore();
  // Contas de funcionário (VIEWER self-service) só têm 1 destino possível —
  // uma sidebar de navegação não faz sentido pra elas (era só um vão vazio
  // enorme). O logo no Topbar já leva de volta pro espelho de ponto.
  const selfServiceViewer = profile?.role === 'VIEWER' && !!profile?.employee_id;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {!selfServiceViewer && <Sidebar />}
      <main
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent",
          // Em telas pequenas a sidebar expandida vira overlay (não empurra o
          // conteúdo) — a margem só cresce para 260px a partir do breakpoint md.
          selfServiceViewer ? "ml-0" : sidebarOpen ? "ml-[84px] md:ml-[260px]" : "ml-[84px]"
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

/** Tela cheia, não-fechável — obrigatória para contas com senha inicial
 *  temporária (provisionamento automático). Bloqueia qualquer navegação até
 *  o usuário definir uma senha própria. */
function MandatoryPasswordGate() {
  const { profile, setProfile } = useAuthStore();
  const [newPw, setNewPw]               = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) { setError("A senha deve ter ao menos 6 caracteres."); return; }
    if (newPw === "123456") { setError("Escolha uma senha diferente da senha temporária."); return; }
    if (newPw !== newPwConfirm) { setError("As senhas não coincidem."); return; }
    setLoading(true); setError(null);
    try {
      const { supabase } = await import('@/src/lib/supabase');
      const { error: err } = await supabase.auth.updateUser({
        password: newPw,
        data: { must_change_password: false },
      });
      if (err) throw err;
      if (profile) setProfile({ ...profile, must_change_password: false });
    } catch (err: any) {
      setError(err?.message ?? "Erro ao definir a nova senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: "rgba(15,32,68,0.92)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-base text-gray-800">Defina sua senha</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Este é seu primeiro acesso. Por segurança, defina uma senha própria antes de continuar.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  disabled={loading}
                  className="w-full px-3 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmar senha</label>
              <input
                type={showPw ? "text" : "password"}
                value={newPwConfirm}
                onChange={e => setNewPwConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                disabled={loading}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
          )}
          <button type="submit" disabled={loading}
            className="w-full mt-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {loading ? "Salvando…" : "Definir senha e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.must_change_password) return <MandatoryPasswordGate />;
  return <>{children}</>;
}

/** Contas de funcionário (VIEWER autoprovisionado, com employee_id) só têm
 *  acesso ao próprio espelho de ponto — qualquer outra rota redireciona
 *  de volta, mesmo se a URL for digitada diretamente. */
function RequireFullAccess({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();
  const selfServiceViewer = profile?.role === 'VIEWER' && !!profile?.employee_id;
  if (selfServiceViewer) return <Navigate to="/ponto" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { profile } = useAuthStore();
  const selfServiceViewer = profile?.role === 'VIEWER' && !!profile?.employee_id;
  return <Navigate to={selfServiceViewer ? "/ponto" : "/dashboard"} replace />;
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
            id:                  user.id,
            email:               user.email ?? "",
            role:                (user.app_metadata?.system_role ?? user.app_metadata?.role ?? "VIEWER") as any,
            organization_id:     user.app_metadata?.organization_id ?? "",
            employee_id:         user.app_metadata?.employee_id,
            must_change_password: !!user.user_metadata?.must_change_password,
          });
        } else {
          setProfile(null);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        if (user) {
          setProfile({
            id:                  user.id,
            email:               user.email ?? "",
            role:                (user.app_metadata?.system_role ?? user.app_metadata?.role ?? "VIEWER") as any,
            organization_id:     user.app_metadata?.organization_id ?? "",
            employee_id:         user.app_metadata?.employee_id,
            must_change_password: !!user.user_metadata?.must_change_password,
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
          <Route path="/" element={<RequireAuth><RootRedirect /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><RequireFullAccess><MainLayout><DashboardPage /></MainLayout></RequireFullAccess></RequireAuth>} />
          <Route path="/upload" element={<RequireAuth><RequireFullAccess><MainLayout><Upload /></MainLayout></RequireFullAccess></RequireAuth>} />
          <Route path="/employees" element={<RequireAuth><RequireFullAccess><MainLayout><Employees /></MainLayout></RequireFullAccess></RequireAuth>} />
          <Route path="/ponto" element={<RequireAuth><MainLayout><TimeCard /></MainLayout></RequireAuth>} />
          <Route path="/pin" element={<RequireAuth><RequireFullAccess><MainLayout><PinProject /></MainLayout></RequireFullAccess></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><RequireFullAccess><MainLayout><SettingsPage /></MainLayout></RequireFullAccess></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
