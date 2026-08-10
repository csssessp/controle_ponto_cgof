import { supabase } from "./supabase";

// Instala um wrapper global em window.fetch que anexa
// "Authorization: Bearer <access_token>" em toda chamada para /api/*, usando
// a sessão Supabase ativa. Assim as ~60 chamadas fetch("/api/...") espalhadas
// pelo app continuam funcionando sem precisar editar cada uma — o servidor
// (server.ts) agora exige esse token em toda rota /api/* (exceto /api/health).
const originalFetch = window.fetch.bind(window);

function isApiPath(input: RequestInfo | URL): boolean {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  try {
    const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
    return path.startsWith("/api/");
  } catch {
    return false;
  }
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!isApiPath(input) || !supabase) {
    return originalFetch(input, init);
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return originalFetch(input, init);

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return originalFetch(input, { ...init, headers });
};
