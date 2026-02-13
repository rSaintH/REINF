import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Building,
  FileSpreadsheet,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, isAdmin, roleName, signOut } = useAuth();

  const navItems = [
    {
      to: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: "/empresas",
      label: "Cadastro de Empresas",
      icon: Building,
      show: true,
    },
    {
      to: "/reinf",
      label: "EFD-REINF",
      icon: FileSpreadsheet,
      show: true,
    },
    {
      to: "/admin",
      label: "Administração",
      icon: Shield,
      show: isAdmin,
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-primary">REINF</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Footer - User Info & Logout */}
      <div className="p-4">
        {!collapsed && profile && (
          <div className="mb-3 truncate text-sm">
            <p className="font-medium text-sidebar-foreground truncate">
              {profile.full_name}
              {roleName && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({roleName})
                </span>
              )}
              {isAdmin && !roleName && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (Admin)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.email}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className={cn("w-full text-destructive hover:text-destructive", collapsed && "w-8")}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
