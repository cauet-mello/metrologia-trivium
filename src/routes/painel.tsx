import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { usePortaoInspetor } from "@/components/PortaoInspetor";
import { celulasQuery, historicoQuery, nomeDaCelula, type Registro } from "@/lib/dados";
import { alterarSaida, statusInspetor } from "@/lib/inspetor.functions";
import { duracaoMinutos, formatarData, formatarDuracao, formatarHora } from "@/lib/constantes";
import { exportarPlanilha } from "@/lib/exportar";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel de indicadores | Trivium Qualidade" },
      { name: "description", content: "Indicadores de medições de ferrolhos na tridimensional Zeiss e exportação da planilha." },
      { property: "og:title", content: "Painel de indicadores | Trivium Qualidade" },
      { property: "og:description", content: "Medições do dia, tempo médio e histórico completo de ferrolhos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function hojeISO() {
  return new Date().toLocaleDateString("sv-SE");
}

function Painel() {
  const { data = [], isPending } = useQuery({ ...historicoQuery, refetchInterval: 60000 });
  const celulas = useQuery(celulasQuery);
  // "" = todos os dias: o painel mostra sempre o histórico inteiro de registros.
  const [dia, setDia] = useState("");
  const [erroSaida, setErroSaida] = useState<string | null>(null);
  const [datasExport, setDatasExport] = useState<string[]>([]);
  const inspetor = usePortaoInspetor();
  const liberado = inspetor.data?.liberado === true;
  const verificarInspetor = useServerFn(statusInspetor);
  const queryClient = useQueryClient();
  const [gerando, setGerando] = useState(false);
  const [erroPlanilha, setErroPlanilha] = useState<string | null>(null);

  async function gerarPlanilha(registros: Registro[]) {
    if (!liberado || gerando || !registros.length) return;
    setGerando(true);
    setErroPlanilha(null);
    try {
      const acesso = await verificarInspetor({});
      queryClient.setQueryData(["inspetor"], acesso);
      if (!acesso.liberado) {
        setErroPlanilha("Entre novamente como inspetor para gerar a planilha.");
        return;
      }
      exportarPlanilha(registros);
    } catch {
      setErroPlanilha("Não foi possível verificar seu acesso. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  // Virada do dia: à meia-noite o painel passa automaticamente para o novo dia.
  const ultimoHoje = useRef(hojeISO());
  useEffect(() => {
    const t = setInterval(() => {
      const agora = hojeISO();
      if (agora !== ultimoHoje.current) {
        setDia((atual) => (atual === ultimoHoje.current ? agora : atual));
        ultimoHoje.current = agora;
      }
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const doDia = useMemo(
    () => (dia ? data.filter((r) => new Date(r.hora_entrada).toLocaleDateString("sv-SE") === dia) : data),
    [data, dia],
  );
  const fechados = doDia.filter((r) => r.hora_saida);
  const abertos = doDia.filter((r) => !r.hora_saida);
  const media = fechados.length
    ? Math.round(fechados.reduce((s, r) => s + duracaoMinutos(r.hora_entrada, r.hora_saida), 0) / fechados.length)
    : 0;

  const porCelula = useMemo(() => {
    const m = new Map<number, number>();
    doDia.forEach((r) => m.set(r.celula, (m.get(r.celula) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [doDia]);
  const maxCel = Math.max(1, ...porCelula.map(([, n]) => n));

  const doSelecionadas = data.filter((r) =>
    datasExport.includes(new Date(r.hora_entrada).toLocaleDateString("sv-SE")),
  );

  return (
    <AppShell
      titulo="Painel de Indicadores"
      descricao={liberado ? "Acompanhe o volume de medições e baixe a planilha atualizada." : "Acompanhe o volume de medições."}
      acao={
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="control w-auto" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Filtrar registros por dia" />
          <button type="button" className="btn-base btn-ghost text-foreground" onClick={() => setDia("")} disabled={!dia} title="Mostrar todos os dias">
            Todos os dias
          </button>
          {liberado && dia && (
            <button className="btn-base btn-ghost text-foreground" onClick={() => gerarPlanilha(doDia)} disabled={gerando || !doDia.length}>
              Planilha do dia
            </button>
          )}
          {liberado && (
            <button className="btn-base btn-primary" onClick={() => gerarPlanilha(data)} disabled={gerando || !data.length}>
              Planilha completa
            </button>
          )}
        </div>
      }
    >
      {erroPlanilha && <p role="alert" className="mb-5 text-sm text-destructive">{erroPlanilha}</p>}
      {liberado && <section className="panel mb-5 flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="field-label" htmlFor="add-data">Planilha por datas selecionadas</label>
          <input
            id="add-data"
            type="date"
            className="control w-auto"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v && !datasExport.includes(v)) setDatasExport([...datasExport, v].sort());
            }}
          />
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          {datasExport.length === 0 && (
            <span className="text-sm text-muted-foreground">Adicione um ou mais dias.</span>
          )}
          {datasExport.map((d) => (
            <button
              key={d}
              type="button"
              className="chip hover:border-destructive/50 hover:text-destructive"
              title="Remover data"
              onClick={() => setDatasExport(datasExport.filter((x) => x !== d))}
            >
              {d.split("-").reverse().join("/")} ✕
            </button>
          ))}
        </div>
        <button
          className="btn-base btn-primary"
          disabled={gerando || !doSelecionadas.length}
          onClick={() => gerarPlanilha(doSelecionadas)}
        >
          Gerar planilha ({doSelecionadas.length})
        </button>
      </section>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo={dia ? "Lançamentos no dia" : "Lançamentos no total"} valor={doDia.length} />
        <Kpi rotulo="Medições concluídas" valor={fechados.length} />
        <Kpi rotulo="Aguardando agora" valor={abertos.length} destaque />
        <Kpi rotulo="Tempo médio" valor={media >= 60 ? `${Math.floor(media / 60)}h ${media % 60}min` : `${media}min`} />
      </div>

      <section className="panel mt-5 p-5">
          <h2 className="font-display text-lg font-bold">Lançamentos por Célula</h2>
          {porCelula.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{dia ? "Sem lançamentos neste dia." : "Sem lançamentos registrados."}</p>}
          <ul className="mt-4 space-y-2">
            {porCelula.map(([cel, n]) => (
              <li key={cel} className="flex items-center gap-3 text-sm">
                <span className="w-32 min-w-0 truncate text-muted-foreground" title={nomeDaCelula(celulas.data, cel)}>
                  {nomeDaCelula(celulas.data, cel)}
                </span>
                <div className="h-3 flex-1 rounded bg-surface-2">
                  <div className="h-3 rounded bg-accent" style={{ width: `${(n / maxCel) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-semibold">{n}</span>
              </li>
            ))}
          </ul>
      </section>

      <section className="mt-5 min-w-0 p-2">
          <h2 className="font-display text-lg font-bold">{dia ? "Registros do Dia" : "Todos os Registros"}</h2>
          {erroSaida && (
            <p className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {erroSaida}
            </p>
          )}
          {isPending ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="mt-4 max-h-[26rem] overflow-auto rounded-md border border-border" role="region" aria-label={dia ? "Registros do Dia" : "Todos os Registros"} tabIndex={0}>
            <table className="tabela-densa w-full min-w-[1080px] table-fixed text-left text-sm [overflow-wrap:normal]">
              <thead className="sticky top-0 bg-surface text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-[26%] whitespace-nowrap">Modelo</th>
                  <th className="w-[9.7%] whitespace-nowrap">Cél.</th>
                  <th className="w-[18.5%] whitespace-nowrap">Operador</th>
                  <th className="w-[12.6%] whitespace-nowrap">Operação</th>
                  <th className="w-[9.7%] whitespace-nowrap">Entrada</th>
                  <th className="w-[8%] whitespace-nowrap">Saída</th>
                  <th className="w-[8.7%] whitespace-nowrap">Permanência</th>
                  <th className="w-[6.8%] whitespace-nowrap">Atraso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {doDia.map((r) => {
                  const cel = nomeDaCelula(celulas.data, r.celula);
                  return (
                  <tr key={r.id}>
                    <td className="truncate" title={r.modelo}>{r.modelo}</td>
                    <td className="truncate" title={cel}>{cel}</td>
                    <td className="truncate" title={r.operador}>{r.operador}</td>
                    <td className="break-words leading-snug">{r.operacao}</td>
                    <td className="whitespace-nowrap tabular-nums">
                      {formatarData(r.hora_entrada)}{" "}
                      <span className="text-xs text-muted-foreground">{formatarHora(r.hora_entrada)}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      {!r.hora_saida ? (
                        <span className="chip">Aberto</span>
                      ) : liberado ? (
                        <SaidaEditavel r={r} onErro={setErroSaida} />
                      ) : (
                        <span className="tabular-nums">{formatarHora(r.hora_saida)}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{formatarDuracao(r.hora_entrada, r.hora_saida)}</td>
                    <td>{r.atraso && <span className="chip border-destructive/50 text-destructive">Atraso</span>}</td>
                  </tr>
                  );
                })}
                {doDia.length === 0 && <tr><td colSpan={8} className="text-muted-foreground">{dia ? "Nenhum registro neste dia." : "Nenhum registro lançado ainda."}</td></tr>}
              </tbody>
            </table>
            </div>
          )}
      </section>
    </AppShell>
  );
}

function SaidaEditavel({ r, onErro }: { r: Registro; onErro: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const salvar = useServerFn(alterarSaida);
  const atual = formatarHora(r.hora_saida);
  const [valor, setValor] = useState(atual);
  useEffect(() => setValor(atual), [atual]);

  async function confirmar() {
    if (!valor || valor === atual || !r.hora_saida) return;
    const [h, m] = valor.split(":").map(Number);
    const d = new Date(r.hora_saida);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    try {
      await salvar({ data: { id: r.id, hora_saida: d.toISOString() } });
      onErro(null);
      await queryClient.invalidateQueries({ queryKey: ["registros"] });
    } catch (e) {
      onErro(e instanceof Error ? e.message : "Não foi possível alterar a saída.");
      setValor(atual);
    }
  }

  return (
    <input
      type="time"
      aria-label={`Horário de saída do registro ${r.id}`}
      className="control w-20 px-1 py-1 tabular-nums"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

function Kpi({ rotulo, valor, destaque }: { rotulo: string; valor: string | number; destaque?: boolean }) {
  return (
    <div className="panel p-5">
      <p className="field-label">{rotulo}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${destaque ? "text-accent" : ""}`}>{valor}</p>
    </div>
  );
}
