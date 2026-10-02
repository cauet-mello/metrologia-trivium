import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  abertosQuery,
  celulasQuery,
  lancarRegistro,
  modelosQuery,
  operadoresQuery,
} from "@/lib/dados";
import { OPERACOES, STATUS_OPCOES, TURNOS, formatarDuracao } from "@/lib/constantes";
import mascote from "@/assets/mascote-trivium.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lançamento de ferrolhos | Trivium Qualidade" },
      {
        name: "description",
        content:
          "Registre a entrada de ferrolhos na máquina tridimensional Zeiss: modelo, turno, operação, célula, operador e status.",
      },
      { property: "og:title", content: "Lançamento de ferrolhos | Trivium Qualidade" },
      {
        property: "og:description",
        content: "Registre a entrada de ferrolhos na medição tridimensional em poucos segundos.",
      },
    ],
  }),
  component: Lancamento,
});

const vazio = {
  modeloId: "",
  turno: "",
  celula: "",
  operador: "",
  status: "",
};

function Lancamento() {
  const queryClient = useQueryClient();
  const modelos = useQuery(modelosQuery);
  const operadores = useQuery(operadoresQuery);
  const celulas = useQuery(celulasQuery);
  const abertos = useQuery(abertosQuery);

  const [form, setForm] = useState(vazio);
  const [operacoes, setOperacoes] = useState<string[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const modelo = modelos.data?.find((m) => m.id === form.modeloId);
      if (!modelo) throw new Error("Modelo inválido.");
      await lancarRegistro({
        modelo: modelo.nome,
        modelo_codigo: modelo.codigo,
        turno: form.turno,
        operacao: operacoes.join(" / "),
        celula: Number(form.celula),
        operador: form.operador,
        status: form.status,
      });
    },
    onSuccess: async () => {
      setForm(vazio);
      setOperacoes([]);
      setErros([]);
      setSucesso("Dados lançados com sucesso! O ferrolho entrou na fila de medição.");
      await queryClient.invalidateQueries({ queryKey: ["registros"] });
    },
    onError: (e: Error) => setErros([e.message]),
  });

  function enviar() {
    const lista: string[] = [];
    if (!form.modeloId) lista.push("Selecione o modelo.");
    if (!form.turno) lista.push("Selecione o turno.");
    if (operacoes.length === 0) lista.push("Selecione ao menos uma operação.");
    if (!form.celula) lista.push("Selecione a célula.");
    if (!form.operador) lista.push("Selecione o operador.");
    if (!form.status) lista.push("Selecione o status.");
    setErros(lista);
    setSucesso(null);
    if (lista.length === 0) mutation.mutate();
  }

  return (
    <AppShell
      titulo="Lançamento de Entrada"
      descricao="Preencha os dados do ferrolho entregue para medição. Tudo fica registrado na base e vai para a planilha."
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <form
          className="panel p-7"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="modelo">
                Modelo do ferrolho
              </label>
              <select
                id="modelo"
                className="control"
                value={form.modeloId}
                onChange={(e) => setForm({ ...form, modeloId: e.target.value })}
              >
                <option value="">Selecione…</option>
                {modelos.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} — {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="celula">
                Célula
              </label>
              <select
                id="celula"
                className="control"
                value={form.celula}
                onChange={(e) => setForm({ ...form, celula: e.target.value })}
              >
                <option value="">Selecione…</option>
                {celulas.data?.map((c) => (
                  <option key={c.id} value={c.numero}>
                    Célula {c.numero}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="operador">
                Operador
              </label>
              <select
                id="operador"
                className="control"
                value={form.operador}
                onChange={(e) => setForm({ ...form, operador: e.target.value })}
              >
                <option value="">Selecione…</option>
                {operadores.data?.map((o) => (
                  <option key={o.id} value={o.nome}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="field-label">Turno</span>
              <div className="flex gap-2">
                {TURNOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, turno: t })}
                    className={`btn-base flex-1 ${form.turno === t ? "btn-primary" : "btn-ghost"}`}
                  >
                    {t}º
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="">Selecione…</option>
                {STATUS_OPCOES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <span className="field-label">Operações medidas</span>
              <div className="flex flex-wrap gap-2">
                {OPERACOES.map((op) => {
                  const marcado = operacoes.includes(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() =>
                        setOperacoes(
                          marcado ? operacoes.filter((o) => o !== op) : [...operacoes, op],
                        )
                      }
                      className={`btn-base ${marcado ? "btn-primary" : "btn-ghost"}`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {erros.length > 0 && (
            <ul className="mt-6 space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {erros.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}

          {sucesso && (
            <p className="mt-6 rounded-md border border-success/50 bg-success/10 p-4 text-sm text-success">
              {sucesso}
            </p>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <button className="btn-base btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Lançando…" : "Lançar dados"}
            </button>
            <button
              type="button"
              className="btn-base btn-ghost"
              onClick={() => {
                setForm(vazio);
                setOperacoes([]);
                setErros([]);
                setSucesso(null);
              }}
            >
              Limpar
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-6">
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <img src={mascote.url} alt="" className="h-16 object-contain" />
              <div>
                <p className="font-display text-xs font-semibold tracking-[0.16em] text-accent uppercase">
                  Aguardando medição
                </p>
                <p className="font-display text-4xl font-bold">{abertos.data?.length ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="font-display text-sm font-bold tracking-wider uppercase">
              Últimas entradas
            </h2>
            <ul className="mt-4 space-y-3">
              {abertos.data?.slice(-6).reverse().map((r) => (
                <li key={r.id} className="border-b border-border/60 pb-3 last:border-0">
                  <p className="text-sm font-semibold">{r.modelo}</p>
                  <p className="text-xs text-muted-foreground">
                    Célula {r.celula} · {r.operador}
                  </p>
                  <p className="mt-1 text-xs text-accent">
                    há {formatarDuracao(r.hora_entrada)} na fila
                  </p>
                </li>
              ))}
              {abertos.data?.length === 0 && (
                <li className="text-sm text-muted-foreground">Nenhum ferrolho na fila agora.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
