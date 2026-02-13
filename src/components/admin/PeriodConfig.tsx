import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
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
import { Loader2 } from "lucide-react";

export default function PeriodConfig() {
  const [configs, setConfigs] = useState<Tables<"regime_period_config">[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from("regime_period_config")
      .select("*")
      .order("regime");

    if (error) {
      toast.error("Erro ao carregar configurações de período.");
      return;
    }
    setConfigs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleChange = async (id: string, regime: string, newTipo: string) => {
    const { error } = await supabase
      .from("regime_period_config")
      .update({ periodo_tipo: newTipo })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar configuração.");
      return;
    }

    toast.success(`Período do regime "${regime}" atualizado para ${newTipo}.`);
    fetchConfigs();
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
      <div>
        <h3 className="text-lg font-medium">Configuração de Períodos</h3>
        <p className="text-sm text-muted-foreground">
          Defina o tipo de período padrão para cada regime tributário.
          Empresas individuais podem ter override na tela de Cadastro de Empresas.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Regime Tributário</TableHead>
            <TableHead>Período Padrão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">
                <Badge variant="outline">{config.regime}</Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={config.periodo_tipo}
                  onValueChange={(val) =>
                    handleChange(config.id, config.regime, val)
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
