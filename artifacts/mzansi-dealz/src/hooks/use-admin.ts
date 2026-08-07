import { useEffect, useSyncExternalStore } from "react";
import { apiUrl, getCsrfToken, setCsrfToken } from "@workspace/api-client-react";

type AdminSessionSnapshot = "checking" | "authenticated" | "unauthenticated";

const listeners = new Set<() => void>();
let sessionState: AdminSessionSnapshot = "checking";
let sessionCheckPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function setSessionState(nextState: AdminSessionSnapshot) {
  sessionState = nextState;
  notify();
}

async function checkAdminSession() {
  if (sessionCheckPromise) return sessionCheckPromise;

  sessionCheckPromise = fetch(apiUrl("/api/admin/session"), {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Admin session check failed: ${response.status}`);
      }
      return response.json() as Promise<{ authenticated?: boolean; csrfToken?: string }>;
    })
    .then((data) => {
      if (data.authenticated) {
        if (data.csrfToken) setCsrfToken(data.csrfToken);
        setSessionState("authenticated");
      } else {
        setSessionState("unauthenticated");
      }
    })
    .catch(() => {
      setSessionState("unauthenticated");
    })
    .finally(() => {
      sessionCheckPromise = null;
    });

  return sessionCheckPromise;
}

export function useAdminToken() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => sessionState,
    () => "checking" as AdminSessionSnapshot,
  );

  useEffect(() => {
    if (sessionState === "checking") void checkAdminSession();
  }, []);

  useEffect(() => {
    if (snapshot !== "authenticated") return;

    const revalidate = () => {
      void checkAdminSession();
    };
    const interval = window.setInterval(revalidate, 60_000);
    window.addEventListener("focus", revalidate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", revalidate);
    };
  }, [snapshot]);

  const setToken = (newToken: string) => {
    setSessionState(newToken ? "authenticated" : "unauthenticated");
  };

  const clearToken = () => {
    void fetch(apiUrl("/api/admin/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
    });
    setSessionState("unauthenticated");
  };

  return {
    token: snapshot === "authenticated" ? "session" : null,
    setToken,
    clearToken,
    isChecking: snapshot === "checking",
  };
}

export function useAdminHeaders(): Record<string, string> {
  const csrfToken = getCsrfToken();
  return csrfToken ? { "x-csrf-token": csrfToken } : {};
}

export function useAdminAuth() {
  const { token, clearToken } = useAdminToken();
  return { token, clearToken };
}
