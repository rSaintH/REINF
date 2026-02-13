import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao sistema REINF.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Olá, {profile?.full_name ?? "Usuário"}!</CardTitle>
          <CardDescription>
            Você está logado no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email:</span> {profile?.email}
            </p>
            <p>
              <span className="font-medium">Tipo:</span>{" "}
              {profile?.is_admin ? (
                <Badge>Administrador</Badge>
              ) : (
                <Badge variant="outline">Usuário</Badge>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
