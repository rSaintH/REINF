import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  FileSpreadsheet,
  Pencil,
  Check,
  Send,
  Loader2,
  Plus,
} from "lucide-react";

type ReinfEntryWithCompany = Tables<"reinf_entries"> & {
  companies: { nome: string; regime: string } | null;
};

const TRIMESTRE_LABELS: Record<number, string> = {
  1: "1º Tri (Jan-Mar)",
  2: "2º Tri (Abr-Jun)",
  3: "3º Tri (Jul-Set)",
  4: "4º Tri (Out-Dez)",
};

const TRIMESTRE_MESES: Record<number, [string, string, string]> = {
  1: ["Janeiro", "Fevereiro", "Março"],
  2: ["Abril", "Maio", "Junho"],
  3: ["Julho", "Agosto", "Setembro"],
  4: ["Outubro", "Novembro", "Dezembro"],
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; nextAction?: string; nextLabel?: string }
> = {
  pendente_contabil: {
    label: "Pendente Contábil",
    variant: "destructive",
    nextAction: "contabil_ok",
    nextLabel: "Enviar para DP",
  },
  contabil_ok: {
    label: "Aguardando DP",
    variant: "outline",
    nextAction: "dp_aprovado",
    nextLabel: "Aprovar",
  },
  dp_aprovado: {
    label: "Aguardando Fiscal",
    variant: "secondary",
    nextAction: "enviado",
    nextLabel: "Marcar Enviado",
  },
  enviado: {
    label: "Enviado",
    variant: "default",
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

// Mapeia nome do setor para a etapa do workflow que o usuário pode executar
function getSectorPermission(roleName: string | null, isAdmin: boolean): "all" | "contabil" | "dp" | "fiscal" | "none" {
  if (isAdmin) return "all";
  if (!roleName) return "none";
  const name = roleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (name.includes("contab")) return "contabil";
  if (name.includes("dp") || name.includes("folha")) return "dp";
  if (name.includes("fiscal")) return "fiscal";
  return "none";
}

export default function Reinf() {
  const { user, profile, isAdmin, roleName } = useAuth();
  const [entries, setEntries] = useState<ReinfEntryWithCompany[]>([]);
  const [companies, setCompanies] = useState<Tables<"companies">[]>([]);
  const [loading, setLoading] = useState(true);

  const permission = getSectorPermission(roleName, isAdmin);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [filterAno, setFilterAno] = useState(currentYear.toString());
  const [filterTrimestre, setFilterTrimestre] = useState(currentQuarter.toString());

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newAno, setNewAno] = useState(currentYear.toString());
  const [newTrimestre, setNewTrimestre] = useState(currentQuarter.toString());
  const [creating, setCreating] = useState(false);

  // Edit lucros dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ReinfEntryWithCompany | null>(null);
  const [lucroMes1, setLucroMes1] = useState("");
  const [lucroMes2, setLucroMes2] = useState("");
  const [lucroMes3, setLucroMes3] = useState("");
  const [savingLucros, setSavingLucros] = useState(false);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("reinf_entries")
      .select("*, companies(nome, regime)")
      .eq("ano", parseInt(filterAno))
      .eq("trimestre", parseInt(filterTrimestre))
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar dados da REINF.");
      return;
    }
    setEntries((data as ReinfEntryWithCompany[]) ?? []);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("nome");
    setCompanies(data ?? []);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [filterAno, filterTrimestre]);

  const handleCreate = async () => {
    if (!newCompanyId) {
      toast.error("Selecione uma empresa.");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("reinf_entries").insert({
      company_id: newCompanyId,
      ano: parseInt(newAno),
      trimestre: parseInt(newTrimestre),
    });
    setCreating(false);

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Já existe uma entrada para esta empresa neste trimestre.");
      } else {
        toast.error("Erro ao criar entrada: " + error.message);
      }
      return;
    }

    toast.success("Entrada criada com sucesso!");
    setCreateOpen(false);
    setNewCompanyId("");
    fetchEntries();
  };

  const openEditDialog = (entry: ReinfEntryWithCompany) => {
    setEditEntry(entry);
    setLucroMes1(entry.lucro_mes1 ? entry.lucro_mes1.toString() : "");
    setLucroMes2(entry.lucro_mes2 ? entry.lucro_mes2.toString() : "");
    setLucroMes3(entry.lucro_mes3 ? entry.lucro_mes3.toString() : "");
    setEditOpen(true);
  };

  const handleSaveLucros = async () => {
    if (!editEntry) return;

    setSavingLucros(true);
    const { error } = await supabase
      .from("reinf_entries")
      .update({
        lucro_mes1: parseCurrency(lucroMes1),
        lucro_mes2: parseCurrency(lucroMes2),
        lucro_mes3: parseCurrency(lucroMes3),
      })
      .eq("id", editEntry.id);

    setSavingLucros(false);

    if (error) {
      toast.error("Erro ao salvar lucros.");
      return;
    }

    toast.success("Lucros salvos com sucesso!");
    setEditOpen(false);
    fetchEntries();
  };

  const handleAdvanceStatus = async (entry: ReinfEntryWithCompany) => {
    const statusConfig = STATUS_CONFIG[entry.status];
    if (!statusConfig?.nextAction) return;

    const updateData: Record<string, unknown> = {
      status: statusConfig.nextAction,
    };

    if (statusConfig.nextAction === "contabil_ok") {
      updateData.contabil_usuario_id = user?.id;
      updateData.contabil_preenchido_em = new Date().toISOString();
    } else if (statusConfig.nextAction === "dp_aprovado") {
      updateData.dp_usuario_id = user?.id;
      updateData.dp_aprovado_em = new Date().toISOString();
    } else if (statusConfig.nextAction === "enviado") {
      updateData.fiscal_usuario_id = user?.id;
      updateData.fiscal_enviado_em = new Date().toISOString();
    }

    const { error } = await supabase
      .from("reinf_entries")
      .update(updateData)
      .eq("id", entry.id);

    if (error) {
      toast.error("Erro ao atualizar status.");
      return;
    }

    toast.success(`Status atualizado para "${STATUS_CONFIG[statusConfig.nextAction]?.label}".`);
    fetchEntries();
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EFD-REINF</h1>
          <p className="text-muted-foreground">
            Controle de envio da EFD-REINF por empresa e trimestre.
          </p>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Ano:</Label>
          <Select value={filterAno} onValueChange={setFilterAno}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Trimestre:</Label>
          <Select value={filterTrimestre} onValueChange={setFilterTrimestre}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((t) => (
                <SelectItem key={t} value={t.toString()}>
                  {TRIMESTRE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(permission === "contabil" || permission === "all") && (
          <div className="ml-auto">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Entrada
            </Button>
          </div>
        )}
      </div>

      {/* Create Entry Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Entrada REINF</DialogTitle>
            <DialogDescription>
              Selecione a empresa e o período para criar uma nova entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={newAno} onValueChange={setNewAno}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trimestre</Label>
                <Select value={newTrimestre} onValueChange={setNewTrimestre}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((t) => (
                      <SelectItem key={t} value={t.toString()}>
                        {TRIMESTRE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lucros Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preencher Lucros</DialogTitle>
            <DialogDescription>
              {editEntry?.companies?.nome} —{" "}
              {TRIMESTRE_LABELS[editEntry?.trimestre ?? 1]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editEntry &&
              TRIMESTRE_MESES[editEntry.trimestre]?.map((mes, idx) => (
                <div key={mes} className="space-y-2">
                  <Label>{mes}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={idx === 0 ? lucroMes1 : idx === 1 ? lucroMes2 : lucroMes3}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (idx === 0) setLucroMes1(val);
                      else if (idx === 1) setLucroMes2(val);
                      else setLucroMes3(val);
                    }}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLucros} disabled={savingLucros}>
              {savingLucros ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Table */}
      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma entrada para {TRIMESTRE_LABELS[parseInt(filterTrimestre)]} de{" "}
          {filterAno}. Clique em "Nova Entrada" para começar.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Mês 1</TableHead>
              <TableHead>Mês 2</TableHead>
              <TableHead>Mês 3</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const statusCfg = STATUS_CONFIG[entry.status];
              const total = (entry.lucro_mes1 || 0) + (entry.lucro_mes2 || 0) + (entry.lucro_mes3 || 0);
              const meses = TRIMESTRE_MESES[entry.trimestre];

              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.companies?.nome ?? "—"}
                  </TableCell>
                  <TableCell title={meses?.[0]}>
                    {formatCurrency(entry.lucro_mes1 || 0)}
                  </TableCell>
                  <TableCell title={meses?.[1]}>
                    {formatCurrency(entry.lucro_mes2 || 0)}
                  </TableCell>
                  <TableCell title={meses?.[2]}>
                    {formatCurrency(entry.lucro_mes3 || 0)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusCfg?.variant ?? "outline"}>
                      {statusCfg?.label ?? entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Contábil: editar lucros (só quando pendente_contabil) */}
                      {entry.status === "pendente_contabil" && (permission === "contabil" || permission === "all") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Preencher lucros"
                          onClick={() => openEditDialog(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Contábil: enviar para DP (só se já preencheu) */}
                      {entry.status === "pendente_contabil" && (permission === "contabil" || permission === "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Enviar para DP"
                          onClick={() => handleAdvanceStatus(entry)}
                          disabled={!entry.lucro_mes1 && !entry.lucro_mes2 && !entry.lucro_mes3}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Enviar para DP
                        </Button>
                      )}

                      {/* DP: aprovar (só quando contabil_ok) */}
                      {entry.status === "contabil_ok" && (permission === "dp" || permission === "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Aprovar"
                          onClick={() => handleAdvanceStatus(entry)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      )}

                      {/* Fiscal: marcar enviado (só quando dp_aprovado) */}
                      {entry.status === "dp_aprovado" && (permission === "fiscal" || permission === "all") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Marcar Enviado"
                          onClick={() => handleAdvanceStatus(entry)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Marcar Enviado
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
