import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { historicoQuery, type Registro } from "@/lib/dados";
import { alterarSaida } from "@/lib/inspetor.functions";
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
  const [dia, setDia] = useState(hojeISO());
  const [erroSaida, setErroSaida] = useState<string | null>(null);

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
    () => data.filter((r) => new Date(r.hora_entrada).toLocaleDateString("sv-SE") === dia),
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

  return (
    <AppShell
      titulo="Painel de Indicadores"
      descricao="Acompanhe o volume de medições e baixe a planilha atualizada."
      acao={
        <div className="flex flex-wrap gap-2">
          <input type="date" className="control w-auto" value={dia} onChange={(e) => setDia(e.target.value)} />
          <button className="btn-base btn-ghost" onClick={() => exportarPlanilha(doDia)} disabled={!doDia.length}>
            Planilha do dia
          </button>
          <button className="btn-base btn-primary" onClick={() => exportarPlanilha(data)} disabled={!data.length}>
            Planilha completa
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Lançamentos no dia" valor={doDia.length} />
        <Kpi rotulo="Medições concluídas" valor={fechados.length} />
        <Kpi rotulo="Aguardando agora" valor={abertos.length} destaque />
        <Kpi rotulo="Tempo médio" valor={media >= 60 ? `${Math.floor(media / 60)}h ${media % 60}min` : `${media}min`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="font-display text-lg font-bold">Lançamentos por Célula</h2>
          {porCelula.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Sem lançamentos neste dia.</p>}
          <ul className="mt-4 space-y-2">
            {porCelula.map(([cel, n]) => (
              <li key={cel} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted-foreground">Cél. {cel}</span>
                <div className="h-3 flex-1 rounded bg-surface-2">
                  <div className="h-3 rounded bg-accent" style={{ width: `${(n / maxCel) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Registros do Dia</h2>
          {erroSaida && (
            <p className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {erroSaida}
            </p>
          )}
          {isPending ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Modelo</th><th>Cél.</th><th>Operador</th><th>Operação</th><th>Entrada</th><th>Saída</th><th>Permanência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {doDia.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{r.modelo}</td>
                    <td>{r.celula}</td>
                    <td>{r.operador}</td>
                    <td>{r.operacao}</td>
                    <td>{formatarData(r.hora_entrada)} {formatarHora(r.hora_entrada)}</td>
                    <td>{r.hora_saida ? <SaidaEditavel r={r} onErro={setErroSaida} /> : <span className="chip">Aberto</span>}</td>
                    <td>{formatarDuracao(r.hora_entrada, r.hora_saida)}</td>
                    <td>{r.atraso && <span className="chip border-destructive/50 text-destructive">Atraso</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>
      </div>
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
      className="control w-28 px-2 py-1"
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
