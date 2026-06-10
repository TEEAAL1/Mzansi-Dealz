import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAdminToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("mzansi_admin_token");
  });

  const setToken = (newToken: string) => {
    localStorage.setItem("mzansi_admin_token", newToken);
    setTokenState(newToken);
  };

  const clearToken = () => {
    localStorage.removeItem("mzansi_admin_token");
    setTokenState(null);
  };

  return { token, setToken, clearToken };
}

export function useAdminHeaders(): Record<string, string> {
  const { token } = useAdminToken();
  return token ? { "x-admin-token": token } : {};
}

export function useAdminAuth() {
  const { token, clearToken } = useAdminToken();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
    }
  }, [token, setLocation]);

  return { token, clearToken };
}
