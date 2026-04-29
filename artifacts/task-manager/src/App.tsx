import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import UsersPage from "@/pages/users";
import NotFound from "@/pages/not-found";

setAuthTokenGetter(() => localStorage.getItem("auth_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function Protected({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/dashboard" />;
  return <Layout>{children}</Layout>;
}

function LoginGate() {
  const { user } = useAuth();
  if (user) return <Redirect to="/dashboard" />;
  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginGate} />
      <Route path="/dashboard">
        <Protected><DashboardPage /></Protected>
      </Route>
      <Route path="/projects">
        <Protected><ProjectsPage /></Protected>
      </Route>
      <Route path="/projects/:id">
        <Protected><ProjectDetailPage /></Protected>
      </Route>
      <Route path="/users">
        <Protected adminOnly><UsersPage /></Protected>
      </Route>
      <Route path="/">
        <RootRedirect />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect to={user ? "/dashboard" : "/login"} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
