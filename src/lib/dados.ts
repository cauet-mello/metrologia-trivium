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

export const celulasQuery = {
  queryKey: ["celulas"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("celulas")
      .select("id, numero")
      .order("numero");
    if (error) throw error;
    return data;
  },
};

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
}) {
  const { error } = await supabase.from("registros").insert(input);
  if (error) throw new Error(error.message);
}
