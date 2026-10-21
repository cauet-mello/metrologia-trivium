import { supabase } from "@/integrations/supabase/client";

export type Registro = {
  id: number;
  modelo: string;
  modelo_codigo: number | null;
  turno: string;
  operacao: string;
  celula: number;
  operador: string;
  status: string;
  hora_entrada: string;
  hora_saida: string | null;
  observacoes: string | null;
  atraso: boolean;
  fila: string | null;
};

export const operadoresQuery = {
  queryKey: ["operadores"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("operadores")
      .select("id, nome")
      .order("nome");
    if (error) throw error;
    return data;
  },
};

export const modelosQuery = {
  queryKey: ["modelos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("modelos")
      .select("id, codigo, nome")
      .order("nome");
    if (error) throw error;
    return data;
  },
};

export type Celula = { id: string; numero: number; nome: string | null };

export const celulasQuery = {
  queryKey: ["celulas"],
  queryFn: async (): Promise<Celula[]> => {
    const { data, error } = await supabase
      .from("celulas")
      .select("id, numero, nome")
      .order("numero");
    if (error) throw error;
    return data as Celula[];
  },
};

export function rotuloCelula(c: { numero: number; nome: string | null }) {
  const nome = c.nome?.trim();
  return nome ? nome : `Célula ${c.numero}`;
}

export function nomeDaCelula(celulas: Celula[] | undefined, numero: number) {
  const c = celulas?.find((x) => x.numero === numero);
  return c ? rotuloCelula(c) : `Célula ${numero}`;
}

export const abertosQuery = {
  queryKey: ["registros", "abertos"],
  queryFn: async (): Promise<Registro[]> => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .is("hora_saida", null)
      .order("hora_entrada", { ascending: true });
    if (error) throw error;
    return data as Registro[];
  },
};

export const historicoQuery = {
  queryKey: ["registros", "historico"],
  queryFn: async (): Promise<Registro[]> => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .order("hora_entrada", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return data as Registro[];
  },
};

export async function lancarRegistro(input: {
  modelo: string;
  modelo_codigo: number | null;
  turno: string;
  operacao: string;
  celula: number;
  operador: string;
  status: string;
}, confirmado = false): Promise<{ confirmacaoNecessaria: boolean; id?: number }> {
  const { data, error } = await supabase.rpc("lancar_ferrolho", { p_dados: input, p_confirmado: confirmado });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data["confirmacaoNecessaria"] !== "boolean")
    throw new Error("Não foi possível confirmar o lançamento. Tente novamente.");
  return { confirmacaoNecessaria: data["confirmacaoNecessaria"], ...(typeof data["id"] === "number" ? { id: data["id"] } : {}) };
}

function listaSimples(tabela: "status_opcoes" | "operacoes" | "turnos") {
  return {
    queryKey: [tabela],
    queryFn: async () => {
      const { data, error } = await supabase.from(tabela).select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  };
}
export const statusQuery = listaSimples("status_opcoes");
export const operacoesQuery = listaSimples("operacoes");
export const turnosQuery = listaSimples("turnos");

export const escalasQuery = {
  queryKey: ["escalas"],
  queryFn: async () => {
    const [h, c] = await Promise.all([
      supabase.from("escala_horarios").select("escala, turno, inicio, fim, celulas").order("inicio"),
      supabase.from("configuracoes").select("valor").eq("chave", "escala_ativa").maybeSingle(),
    ]);
    if (h.error) throw h.error;
    return { horarios: h.data, ativa: c.data?.valor ?? "" };
  },
};
