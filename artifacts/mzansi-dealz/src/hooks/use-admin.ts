import { useEffect, useState } from "react";
import { apiUrl, getCsrfToken, setCsrfToken } from "@workspace/api-client-react";

export function useAdminToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    localStorage.removeItem("mzansi_admin_token");
    return localStorage.getItem("mzansi_admin_authenticated") === "true" ? "session" : null;
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/admin/session"), { credentials: "include" })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean; csrfToken?: string }) => {
        if (data.authenticated) {
          if (data.csrfToken) {
            setCsrfToken(data.csrfToken);
          }
          setTokenState("session");
          localStorage.setItem("mzansi_admin_authenticated", "true");
        } else {
          setTokenState(null);
          localStorage.removeItem("mzansi_admin_authenticated");
        }
      })
      .catch(() => setTokenState(null))
      .finally(() => setIsChecking(false));
  }, []);

  const setToken = (newToken: string) => {
    localStorage.setItem("mzansi_admin_authenticated", "true");
    setTokenState(newToken || "session");
  };

  const clearToken = () => {
    void fetch(apiUrl("/api/admin/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
    });
    localStorage.removeItem("mzansi_admin_authenticated");
    localStorage.removeItem("mzansi_admin_token");
    setTokenState(null);
  };

  return { token, setToken, clearToken, isChecking };
}

export function useAdminHeaders(): Record<string, string> {
  const csrfToken = getCsrfToken();
  return csrfToken ? { "x-csrf-token": csrfToken } : {};
}

export function useAdminAuth() {
  const { token, clearToken } = useAdminToken();
  return { token, clearToken };
}
