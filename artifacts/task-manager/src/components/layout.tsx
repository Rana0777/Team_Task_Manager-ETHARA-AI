import { Link, useLocation } from "wouter";
import { CheckSquare, LayoutDashboard, FolderKanban, Users, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

function NavLink({ href, icon: Icon, label, testId }: { href: string; icon: typeof LayoutDashboard; label: string; testId: string }) {
  const [location] = useLocation();
  const active = location === href || (href !== "/dashboard" && location.startsWith(href));
  return (
    <Link href={href}>
      <a
        data-testid={testId}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </a>
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <a className="flex items-center gap-2 font-semibold tracking-tight" data-testid="link-brand">
                <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <span>Team Tasks</span>
              </a>
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" testId="link-dashboard" />
              <NavLink href="/projects" icon={FolderKanban} label="Projects" testId="link-projects" />
              {user.role === "admin" && (
                <NavLink href="/users" icon={Users} label="Users" testId="link-users" />
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" data-testid="text-current-user-name">{user.name}</span>
              <Badge
                variant={user.role === "admin" ? "default" : "outline"}
                className="text-[10px] px-1.5 py-0 h-5 uppercase tracking-wider"
                data-testid="badge-current-user-role"
              >
                {user.role}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
