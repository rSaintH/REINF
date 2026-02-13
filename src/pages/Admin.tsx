import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesManager from "@/components/admin/RolesManager";
import UsersManager from "@/components/admin/UsersManager";
import PeriodConfig from "@/components/admin/PeriodConfig";
import { Shield } from "lucide-react";

export default function Admin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground">
            Gerencie setores e usuários do sistema.
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="roles">Setores</TabsTrigger>
          <TabsTrigger value="periods">Períodos</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersManager />
        </TabsContent>
        <TabsContent value="roles">
          <RolesManager />
        </TabsContent>
        <TabsContent value="periods">
          <PeriodConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
