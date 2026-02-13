import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Building, Plus, Trash2, Pencil, Loader2 } from "lucide-react";

const REGIMES = [
  "Simples Nacional",
  "Lucro Presumido",
  "Lucro Real",
  "MEI",
];

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cleanCNPJ(value: string) {
  return value.replace(/\D/g, "");
}

export default function Empresas() {
  const [companies, setCompanies] = useState<Tables<"companies">[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [regime, setRegime] = useState("");
  const [periodoTipo, setPeriodoTipo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar empresas.");
      return;
    }
    setCompanies(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNome("");
    setRazaoSocial("");
    setCnpj("");
    setRegime("");
    setPeriodoTipo("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (company: Tables<"companies">) => {
    setEditingId(company.id);
    setNome(company.nome);
    setRazaoSocial(company.razao_social);
    setCnpj(formatCNPJ(company.cnpj));
    setRegime(company.regime);
    setPeriodoTipo(company.periodo_tipo ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !razaoSocial.trim() || !cnpj.trim() || !regime) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const rawCnpj = cleanCNPJ(cnpj);
    if (rawCnpj.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("companies")
          .update({
            nome: nome.trim(),
            razao_social: razaoSocial.trim(),
            cnpj: rawCnpj,
            regime,
            periodo_tipo: periodoTipo || null,
          })
          .eq("id", editingId);

        if (error) throw new Error(error.message);
        toast.success("Empresa atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("companies").insert({
          nome: nome.trim(),
          razao_social: razaoSocial.trim(),
          cnpj: rawCnpj,
          regime,
          periodo_tipo: periodoTipo || null,
        });

        if (error) {
          if (error.message.includes("duplicate") || error.message.includes("unique")) {
            throw new Error("Já existe uma empresa com este CNPJ.");
          }
          throw new Error(error.message);
        }
        toast.success("Empresa cadastrada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar empresa.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${nome}"?`)) return;

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir empresa.");
      return;
    }

    toast.success("Empresa excluída com sucesso!");
    fetchCompanies();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cadastro de Empresas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas no sistema.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Empresas</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Empresa" : "Cadastrar Empresa"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Altere os dados da empresa."
                  : "Preencha os dados para cadastrar uma nova empresa."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empresa-nome">Nome *</Label>
                <Input
                  id="empresa-nome"
                  placeholder="Nome fantasia"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa-razao">Razão Social *</Label>
                <Input
                  id="empresa-razao"
                  placeholder="Razão social completa"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa-cnpj">CNPJ *</Label>
                <Input
                  id="empresa-cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa-regime">Regime *</Label>
                <Select value={regime} onValueChange={setRegime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o regime tributário" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa-periodo">Período (override)</Label>
                <Select value={periodoTipo || "padrao"} onValueChange={(v) => setPeriodoTipo(v === "padrao" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Usar padrão do regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Usar padrão do regime</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Salvar"
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma empresa cadastrada. Clique em "Nova Empresa" para começar.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.nome}</TableCell>
                <TableCell>{company.razao_social}</TableCell>
                <TableCell className="font-mono text-sm">
                  {formatCNPJ(company.cnpj)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{company.regime}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {company.periodo_tipo
                      ? company.periodo_tipo.charAt(0).toUpperCase() + company.periodo_tipo.slice(1)
                      : "Padrão do regime"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar empresa"
                      onClick={() => openEditDialog(company)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      title="Excluir empresa"
                      onClick={() => handleDelete(company.id, company.nome)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
