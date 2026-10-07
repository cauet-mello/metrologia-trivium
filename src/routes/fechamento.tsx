import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { BotaoSairInspetor, PortaoInspetor } from "@/components/PortaoInspetor";
import { abertosQuery, celulasQuery, operadoresQuery, statusQuery } from "@/lib/dados";
import { fecharRegistro, moverFila } from "@/lib/inspetor.functions";
import { filaZeiss, formatarDuracao, formatarHora } from "@/lib/constantes";

export const Route = createFileRoute("/fechamento")({
  head: () => ({
    meta: [
      { title: "Fechamento de medição | Trivium Qualidade" },
      {
        name: "description",
        content:
          "Área do inspetor: encerre a medição do ferrolho na tridimensional e registre as observações.",
      },
      { property: "og:title", content: "Fechamento de medição | Trivium Qualidade" },
      {
        property: "og:description",
        content: "Encerramento das medições de ferrolho com registro de horário e observações.",
      },
    ],
  }),
  component: Fechamento,
});

function Fechamento() {
  return (
    <AppShell
      titulo="Fechamento de Medição"
      descricao="Selecione o ferrolho medido, registre as observações e encerre o atendimento."
    >
      <PortaoInspetor>
        <Lista />
      </PortaoInspetor>
    </AppShell>
  );
}

function Lista() {
  const abertos = useQuery(abertosQuery);
  const celulas = useQuery(celulasQuery);
  const operadores = useQuery(operadoresQuery);
  const STATUS_OPCOES = (useQuery(statusQuery).data ?? []).map((s) => s.nome);
  const queryClient = useQueryClient();
  const fechar = useServerFn(fecharRegistro);

  const [filtroCelula, setFiltroCelula] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [obs, setObs] = useState<Record<number, string>>({});
  const [atraso, setAtraso] = useState<Record<number, boolean>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<"Zeiss 1" | "Zeiss 2" | null>(null);
  const moverFn = useServerFn(moverFila);
  const mover = useMutation({
    mutationFn: async (v: { id: number; fila: "Zeiss 1" | "Zeiss 2" }) =>
      moverFn({ data: { ...v, anterior: v.fila === "Zeiss 1" ? "Zeiss 2" : "Zeiss 1" } }),
    onSuccess: async () => {
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ["registros"] });
    },
    onError: (e: Error) => setErro(e.message),
  });

  const mutation = useMutation({
    mutationFn: async (id: number) =>
      fechar({ data: { id, observacoes: obs[id] ?? "", atraso: atraso[id] === true } }),
    onSuccess: async () => {
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ["registros"] });
    },
    onError: (e: Error) => setErro(e.message),
  });

  const lista = (abertos.data ?? []).filter(
    (r) =>
      (!filtroCelula || String(r.celula) === filtroCelula) &&
      (!filtroOperador || r.operador === filtroOperador) &&
      (!filtroStatus || r.status === filtroStatus),
  );

  const filas = (["Zeiss 1", "Zeiss 2"] as const).map((nome) => ({
    nome,
    itens: lista.filter((r) => filaZeiss(r.status, r.fila) === nome),
  }));

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-44">
          <label className="field-label" htmlFor="f-celula">
            Filtrar por célula
          </label>
          <select
            id="f-celula"
            className="control"
            value={filtroCelula}
            onChange={(e) => setFiltroCelula(e.target.value)}
          >
            <option value="">Todas</option>
            {celulas.data?.map((c) => (
              <option key={c.id} value={c.numero}>
                Célula {c.numero}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-64">
          <label className="field-label" htmlFor="f-operador">
            Filtrar por operador
          </label>
          <select
            id="f-operador"
            className="control"
            value={filtroOperador}
            onChange={(e) => setFiltroOperador(e.target.value)}
          >
            <option value="">Todos</option>
            {operadores.data?.map((o) => (
              <option key={o.id} value={o.nome}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-44">
          <label className="field-label" htmlFor="f-status">
            Filtrar por status
          </label>
          <select
            id="f-status"
            className="control"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {STATUS_OPCOES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <BotaoSairInspetor />
        </div>
      </div>

      {erro && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {erro}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Dica: arraste um ferrolho para a outra fila, ou use o botão "Mover" do cartão.
      </p>
      <div className="grid gap-6 xl:grid-cols-2">
        {filas.map((fila) => (
          <section
            key={fila.nome}
            className={`space-y-4 rounded-lg p-2 transition-colors ${alvo === fila.nome ? "bg-accent/10 outline-2 outline-dashed outline-accent" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (alvo !== fila.nome) setAlvo(fila.nome);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setAlvo(null);
              const id = Number(e.dataTransfer.getData("text/plain"));
              const r = lista.find((x) => x.id === id);
              if (r && filaZeiss(r.status, r.fila) !== fila.nome) mover.mutate({ id, fila: fila.nome });
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                Fila {fila.nome}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {fila.nome === "Zeiss 1" ? "Frequência" : "Demais status"}
                </span>
              </h2>
              <span className="chip">{fila.itens.length} em aberto</span>
            </div>
            {fila.itens.length === 0 ? (
              <div className="panel p-8 text-center text-sm text-muted-foreground">
                Nenhum ferrolho em aberto nesta fila.
              </div>
            ) : (
              fila.itens.map((r) => (
            <article
              key={r.id}
              className="panel cursor-grab p-6 active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(r.id));
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="btn-base btn-ghost px-3 py-1 text-xs"
                  disabled={mover.isPending}
                  onClick={() =>
                    mover.mutate({ id: r.id, fila: fila.nome === "Zeiss 1" ? "Zeiss 2" : "Zeiss 1" })
                  }
                >
                  Mover para {fila.nome === "Zeiss 1" ? "Zeiss 2" : "Zeiss 1"} →
                </button>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                <div className="mr-auto">
                  <span className="chip">#{r.id}</span>
                  <h3 className="mt-2 text-base font-bold">{r.modelo}</h3>
                  <p className="text-sm text-muted-foreground">
                    Célula {r.celula} · {r.turno}º turno · {r.operacao}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.operador}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xs tracking-wider text-muted-foreground uppercase">
                    Entrada {formatarHora(r.hora_entrada)}
                  </p>
                  <p className="font-display text-lg font-bold text-accent">
                    {formatarDuracao(r.hora_entrada)}
                  </p>
                  <span className="chip mt-1">{r.status}</span>
                </div>
              </div>

              <label className="field-label mt-5" htmlFor={`obs-${r.id}`}>
                Observações da medição
              </label>
              <textarea
                id={`obs-${r.id}`}
                className="control min-h-20"
                placeholder="Resultado, desvios encontrados, ações…"
                value={obs[r.id] ?? ""}
                onChange={(e) => setObs({ ...obs, [r.id]: e.target.value })}
              />

              <label
                className="mt-4 flex cursor-pointer items-center gap-3 rounded-md border border-border/60 bg-surface-2 p-3 text-sm"
                htmlFor={`atraso-${r.id}`}
              >
                <input
                  id={`atraso-${r.id}`}
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={atraso[r.id] === true}
                  onChange={(e) => setAtraso({ ...atraso, [r.id]: e.target.checked })}
                />
                <span>
                  <strong>Atraso</strong> — ferrolho inserido fora do horário de medição
                </span>
              </label>

              <button
                className="btn-base btn-primary mt-4 w-full"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(r.id)}
              >
                Fechar registro
              </button>
            </article>
              ))
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
