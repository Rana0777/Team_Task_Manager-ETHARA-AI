import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useLogin, useSignup, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import type { User, LoginBody, SignupBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextValue {
  user: User | null;
  login: (data: LoginBody) => Promise<void>;
  signup: (data: SignupBody) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const loginMutation = useLogin();
  const signupMutation = useSignup();

  const { data: currentUser, error, isLoading } = useGetCurrentUser({
    query: {
      enabled: !!token,
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      localStorage.setItem("auth_user", JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    qc.clear();
    setLocation("/login");
  }, [qc, setLocation]);

  useEffect(() => {
    if (error && (error as { status?: number }).status === 401) {
      logout();
    }
  }, [error, logout]);

  const login = async (data: LoginBody) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("auth_token", res.token);
    localStorage.setItem("auth_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    qc.clear();
    setLocation("/dashboard");
  };

  const signup = async (data: SignupBody) => {
    const res = await signupMutation.mutateAsync({ data });
    localStorage.setItem("auth_token", res.token);
    localStorage.setItem("auth_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    qc.clear();
    setLocation("/dashboard");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading: isLoading && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
