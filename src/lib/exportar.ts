import * as XLSX from "xlsx";

import type { Registro } from "./dados";
import { formatarData, formatarDuracao, formatarHora } from "./constantes";

export function exportarPlanilha(registros: Registro[]) {
  const linhas = registros.map((r) => ({
    ID: r.id,
    CODIGO: r.modelo_codigo ?? "",
    MODELO: r.modelo,
    TURNO: r.turno,
    OPERACAO: r.operacao,
    CELULA: r.celula,
    OPERADOR: r.operador,
    STATUS: r.status,
    DATA: formatarData(r.hora_entrada),
    HORA_ENTRADA: formatarHora(r.hora_entrada),
    HORA_SAIDA: formatarHora(r.hora_saida),
    PERMANENCIA: r.hora_saida ? formatarDuracao(r.hora_entrada, r.hora_saida) : "EM MEDIÇÃO",
    OBSERVACOES: r.observacoes ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(linhas);
  sheet["!cols"] = [
    { wch: 6 }, { wch: 10 }, { wch: 44 }, { wch: 7 }, { wch: 14 }, { wch: 8 },
    { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 40 },
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "REGISTROS");

  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `registros_ferrolhos_${hoje}.xlsx`);
}
