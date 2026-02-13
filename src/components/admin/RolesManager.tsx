import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function RolesManager() {
  const [roles, setRoles] = useState<Tables<"roles">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar setores.");
      return;
    }
    setRoles(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Informe o nome do setor.");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("roles").insert({ name: newRoleName.trim() });
    setCreating(false);

    if (error) {
      toast.error("Erro ao criar setor. Verifique se já não existe um setor com este nome.");
      return;
    }

    toast.success("Setor criado com sucesso!");
    setNewRoleName("");
    setDialogOpen(false);
    fetchRoles();
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o setor "${name}"?`)) return;

    const { error } = await supabase.from("roles").delete().eq("id", id);

    if (error) {
      toast.error(
        "Erro ao excluir setor. Verifique se não existem usuários neste setor."
      );
      return;
    }

    toast.success("Setor excluído com sucesso!");
    fetchRoles();
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
        <h3 className="text-lg font-medium">Setores</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Novo Setor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Setor</DialogTitle>
              <DialogDescription>
                Defina o nome do novo setor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="role-name">Nome do Setor</Label>
              <Input
                id="role-name"
                placeholder="Ex: Financeiro, TI, RH, Comercial..."
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateRole} disabled={creating}>
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

      {roles.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Nenhum setor cadastrado. Crie o primeiro setor clicando no botão acima.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRole(role.id, role.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
