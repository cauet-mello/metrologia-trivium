export const OPERACOES = ["OP40", "OP50", "OP60", "OP70", "DESBASTE", "GRAVAÇÃO", "BROCHA"] as const;
export const TURNOS = ["1", "2", "3"] as const;
export const STATUS_OPCOES = ["Rota", "Sequência", "Prioridade", "Setup", "Frequência"] as const;

/** Escolha manual do inspetor prevalece; senão Prioridade → Zeiss 2, demais → Zeiss 1. */
export function filaZeiss(status: string, fila?: string | null): "Zeiss 1" | "Zeiss 2" {
  if (fila === "Zeiss 1" || fila === "Zeiss 2") return fila;
  return status === "Prioridade" ? "Zeiss 2" : "Zeiss 1";
}

export function formatarHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function duracaoMinutos(entrada: string, saida?: string | null): number {
  const fim = saida ? new Date(saida).getTime() : Date.now();
  return Math.max(0, Math.round((fim - new Date(entrada).getTime()) / 60000));
}

export function formatarDuracao(entrada: string, saida?: string | null): string {
  const total = duracaoMinutos(entrada, saida);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}
