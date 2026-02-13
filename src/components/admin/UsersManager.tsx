import { useEffect, useState } from "react";
import { supabase, createTempClient } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, Building2, Loader2 } from "lucide-react";

type ProfileWithRole = Tables<"profiles"> & {
  roles: { name: string } | null;
};

const NO_SECTOR = "__none__";

export default function UsersManager() {
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [roles, setRoles] = useState<Tables<"roles">[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset password dialog state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserName, setResetUserName] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Change sector dialog state
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorUserId, setSectorUserId] = useState("");
  const [sectorUserName, setSectorUserName] = useState("");
  const [sectorRoleId, setSectorRoleId] = useState("");
  const [savingSector, setSavingSector] = useState(false);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, roles(name)")
      .order("full_name");

    if (error) {
      toast.error("Erro ao carregar usuários.");
      return;
    }
    setUsers((data as ProfileWithRole[]) ?? []);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from("roles").select("*").order("name");
    setRoles(data ?? []);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setCreating(true);

    try {
      // Criar usuário via signUp em client temporário (não afeta sessão do admin)
      const tempClient = createTempClient();
      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: { data: { full_name: newName.trim() } },
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error("Erro ao criar usuário.");

      // Confirmar email automaticamente via função SECURITY DEFINER
      await supabase.rpc("admin_confirm_user", { p_user_id: signUpData.user.id });

      // Criar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: signUpData.user.id,
          full_name: newName.trim(),
          email: newEmail.trim(),
          role_id: newRoleId || null,
          is_admin: false,
        });

      if (profileError) throw new Error(profileError.message);

      toast.success("Usuário criado com sucesso!");
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRoleId("");
      setCreateOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar usuário.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword.trim()) {
      toast.error("Informe a nova senha.");
      return;
    }

    if (resetPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setResetting(true);

    try {
      const { data, error } = await supabase.rpc("admin_reset_password", {
        p_user_id: resetUserId,
        p_password: resetPassword,
      });

      if (error) throw new Error(error.message);
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);

      toast.success(`Senha de "${resetUserName}" redefinida com sucesso!`);
      setResetPassword("");
      setResetOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao redefinir senha.";
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  const handleChangeSector = async () => {
    setSavingSector(true);

    try {
      const newRoleValue = sectorRoleId === NO_SECTOR ? null : sectorRoleId;

      const { error } = await supabase
        .from("profiles")
        .update({ role_id: newRoleValue })
        .eq("id", sectorUserId);

      if (error) throw new Error(error.message);

      toast.success(`Setor de "${sectorUserName}" atualizado com sucesso!`);
      setSectorOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar setor.";
      toast.error(message);
    } finally {
      setSavingSector(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`
      )
    )
      return;

    try {
      const { data, error } = await supabase.rpc("admin_delete_user", {
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);

      toast.success("Usuário excluído com sucesso!");
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao excluir usuário.";
      toast.error(message);
    }
  };

  const openResetDialog = (userId: string, userName: string) => {
    setResetUserId(userId);
    setResetUserName(userName);
    setResetPassword("");
    setResetOpen(true);
  };

  const openSectorDialog = (userId: string, userName: string, currentRoleId: string | null) => {
    setSectorUserId(userId);
    setSectorUserName(userName);
    setSectorRoleId(currentRoleId ?? NO_SECTOR);
    setSectorOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Usuários</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nome *</Label>
                <Input
                  id="user-name"
                  placeholder="Nome completo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Senha *</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Setor</Label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Criar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para{" "}
              <span className="font-medium">{resetUserName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Nova Senha</Label>
            <Input
              id="reset-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Redefinir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Sector Dialog */}
      <Dialog open={sectorOpen} onOpenChange={setSectorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Setor</DialogTitle>
            <DialogDescription>
              Altere o setor de{" "}
              <span className="font-medium">{sectorUserName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sector-select">Setor</Label>
            <Select value={sectorRoleId} onValueChange={setSectorRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SECTOR}>Nenhum (remover setor)</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangeSector} disabled={savingSector}>
              {savingSector ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {users.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Nenhum usuário cadastrado além do administrador.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.roles?.name ? (
                    <Badge variant="secondary">{user.roles.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Sem setor
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {user.is_admin ? (
                    <Badge>Admin</Badge>
                  ) : (
                    <Badge variant="outline">Usuário</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Alterar setor"
                      onClick={() =>
                        openSectorDialog(user.id, user.full_name, user.role_id)
                      }
                    >
                      <Building2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Redefinir senha"
                      onClick={() =>
                        openResetDialog(user.id, user.full_name)
                      }
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {!user.is_admin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Excluir usuário"
                        onClick={() =>
                          handleDeleteUser(user.id, user.full_name)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
