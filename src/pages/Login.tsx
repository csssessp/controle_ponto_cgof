import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/src/lib/store";
import { supabase } from "@/src/lib/supabase";

export default function Login() {
  const { setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const user = data.user;
      setProfile({
        id:              user.id,
        email:           user.email ?? email,
        role:            (user.app_metadata?.system_role ?? user.app_metadata?.role ?? user.user_metadata?.role ?? "VIEWER") as any,
        organization_id: user.app_metadata?.organization_id ?? "",
        employee_id:     user.app_metadata?.employee_id,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("Invalid login") || msg.includes("invalid_credentials")) {
        setError("E-mail ou senha incorretos.");
      } else if (msg.includes("Email not confirmed")) {
        setError("E-mail ainda não confirmado.");
      } else {
        setError("Erro ao conectar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #e8edf4 0%, #dde4ef 100%)" }}
    >
      <div
        className="w-full max-w-[420px] mx-4"
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.13)",
          padding: "44px 40px 36px",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <img
            src="/img/Brasão.png"
            alt="Brasão SP"
            style={{ height: 88, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Titles */}
        <div className="text-center mb-8">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2a45", letterSpacing: "-0.3px", marginBottom: 4 }}>
            Controle de Ponto
          </h1>
          <p style={{ fontSize: 14, color: "#7a8aa0", fontWeight: 500 }}>Assessoria CGOF</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}
            >
              Email
            </label>
            <div className="relative">
              <span
                className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                style={{ paddingLeft: 14 }}
              >
                {/* User icon */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9baab8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                disabled={loading}
                style={{
                  width: "100%",
                  paddingLeft: 42,
                  paddingRight: 14,
                  paddingTop: 11,
                  paddingBottom: 11,
                  fontSize: 14,
                  borderRadius: 10,
                  border: "1.5px solid #d1dae6",
                  outline: "none",
                  color: "#1a2a45",
                  background: "#fff",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#3b82f6")}
                onBlur={e  => (e.target.style.borderColor = "#d1dae6")}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label
              htmlFor="password"
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 6 }}
            >
              Senha
            </label>
            <div className="relative">
              <span
                className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
                style={{ paddingLeft: 14 }}
              >
                {/* Lock icon */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9baab8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  paddingLeft: 42,
                  paddingRight: 42,
                  paddingTop: 11,
                  paddingBottom: 11,
                  fontSize: 14,
                  borderRadius: 10,
                  border: "1.5px solid #d1dae6",
                  outline: "none",
                  color: "#1a2a45",
                  background: "#fff",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#3b82f6")}
                onBlur={e  => (e.target.style.borderColor = "#d1dae6")}
              />
              {/* show/hide toggle */}
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9baab8",
                }}
                tabIndex={-1}
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                padding: "9px 14px",
                fontSize: 13,
                color: "#b91c1c",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 0",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: loading ? "#93c5fd" : "#2563eb",
              border: "none",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s, transform 0.1s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#2563eb"; }}
            onMouseDown={e  => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
            onMouseUp={e    => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Entrando…
              </span>
            ) : "Entrar no Sistema"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 12, color: "#aab8c8", marginTop: 24 }}>
          Acesso restrito a usuários autorizados.
        </p>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
