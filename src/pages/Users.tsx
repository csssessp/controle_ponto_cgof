import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield, UserPlus, Trash2, Pencil, Check, X, RefreshCw, Eye, Edit, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SystemRole = "ADMIN" | "AUDITOR" | "VIEWER";

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  created_at: string;
  last_sign_in?: string;
  confirmed: boolean;
}

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<SystemRole, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  ADMIN: {
    label: "Administrador",
    description: "Acesso total ao sistema. Pode criar e remover usuários, editar todos os registros e exportar dados.",
    icon: <Crown className="w-4 h-4" />,
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  AUDITOR: {
    label: "Auditor",
    description: "Pode visualizar e editar registros de ponto, justificativas e relatórios. Não gerencia usuários.",
    icon: <Edit className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  VIEWER: {
    label: "Visualizador",
    description: "Acesso somente leitura. Pode consultar espelhos de ponto e exportar relatórios.",
    icon: <Eye className="w-4 h-4" />,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

// ── RoleBadge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: SystemRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);

  // New/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "VIEWER" as SystemRole, password: "" });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/system-users");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao carregar usuários");
      setUsers(d.users || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: "", name: "", role: "VIEWER", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditingUser(u);
    setForm({ email: u.email, name: u.name, role: u.role, password: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.email.trim()) return toast.error("E-mail obrigatório");
    if (!editingUser && !form.password.trim()) return toast.error("Senha obrigatória para novo usuário");
    setSaving(true);
    try {
      const url = editingUser ? `/api/system-users/${editingUser.id}` : "/api/system-users";
      const method = editingUser ? "PATCH" : "POST";
      const body: any = { email: form.email.trim(), name: form.name.trim(), role: form.role };
      if (!editingUser) body.password = form.password;
      else if (form.password.trim()) body.password = form.password.trim();

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao salvar");
      toast.success(editingUser ? "Usuário atualizado" : "Usuário criado");
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/system-users/${deleteId}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao excluir");
      toast.success("Usuário removido");
      setDeleteId(null);
      setUsers(prev => prev.filter(u => u.id !== deleteId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Configurações</span>
            <span>›</span>
            <span className="text-foreground font-medium">Usuários do Sistema</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
            Usuários &amp; Permissões
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os acessos ao sistema. Cada perfil define o nível de permissão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.entries(ROLE_CONFIG) as [SystemRole, typeof ROLE_CONFIG[SystemRole]][]).map(([role, cfg]) => (
          <div key={role} className="border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-2 mb-1">
              <RoleBadge role={role} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{cfg.description}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">
            {loading ? "Carregando…" : `${users.length} usuário${users.length !== 1 ? "s" : ""}`}
          </span>
          <Shield className="w-4 h-4 text-muted-foreground" />
        </div>

        {users.length === 0 && !loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum usuário cadastrado</p>
            <p className="text-sm mt-1">Crie o primeiro usuário clicando em "Novo Usuário"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">E-mail</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Perfil</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Criado em</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Último acesso</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <td className="px-5 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(u.last_sign_in)}</td>
                    <td className="px-4 py-3">
                      {u.confirmed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                          <Check className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@saude.sp.gov.br"
                disabled={!!editingUser}
              />
              {editingUser && <p className="text-xs text-muted-foreground">E-mail não pode ser alterado após criação.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as SystemRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <div>
                        <div className="font-medium">Administrador</div>
                        <div className="text-xs text-muted-foreground">Acesso total</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="AUDITOR">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Auditor</div>
                        <div className="text-xs text-muted-foreground">Leitura e edição de registros</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-medium">Visualizador</div>
                        <div className="text-xs text-muted-foreground">Somente leitura</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editingUser ? "Nova senha (opcional)" : "Senha inicial"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : editingUser ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover usuário?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Esta ação é irreversível. O usuário perderá acesso imediatamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removendo…" : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
