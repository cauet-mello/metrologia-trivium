import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import {
  abertosQuery,
  celulasQuery,
  lancarRegistro,
  modelosQuery,
  nomeDaCelula,
  operadoresQuery,
  operacoesQuery,
  rotuloCelula,
  statusQuery,
  turnosQuery,
} from "@/lib/dados";
import { formatarDuracao } from "@/lib/constantes";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const TURNOS = (useQuery(turnosQuery).data ?? []).map((t) => t.nome);
  const STATUS_OPCOES = (useQuery(statusQuery).data ?? []).map((s) => s.nome);
  const OPERACOES = (useQuery(operacoesQuery).data ?? []).map((o) => o.nome);

  const [form, setForm] = useState(vazio);
  const [operacoes, setOperacoes] = useState<string[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [confirmarAtraso, setConfirmarAtraso] = useState(false);

  const mutation = useMutation({
    mutationFn: async (confirmado: boolean) => {
      const modelo = modelos.data?.find((m) => m.id === form.modeloId);
      if (!modelo) throw new Error("Modelo inválido.");
      return lancarRegistro({
        modelo: modelo.nome,
        modelo_codigo: modelo.codigo,
        turno: form.turno,
        operacao: operacoes.join(" / "),
        celula: Number(form.celula),
        operador: form.operador,
        status: form.status,
      }, confirmado);
    },
    onSuccess: async (resultado) => {
      if (resultado.confirmacaoNecessaria) {
        setConfirmarAtraso(true);
        return;
      }
      setConfirmarAtraso(false);
      setForm(vazio);
      setOperacoes([]);
      setErros([]);
      setSucesso("Dados lançados com sucesso! O ferrolho entrou na fila de medição.");
      await queryClient.invalidateQueries({ queryKey: ["registros"] });
      await queryClient.invalidateQueries({ queryKey: ["alteracoes"] });
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
    if (lista.length === 0 && !mutation.isPending) mutation.mutate(false);
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
          <fieldset disabled={mutation.isPending} className="grid min-w-0 gap-6 sm:grid-cols-2">
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
                    {rotuloCelula(c)}
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
                  <Button
                    key={t}
                    type="button"
                    aria-pressed={form.turno === t}
                    onClick={() => setForm({ ...form, turno: t })}
                    className={`btn-base flex-1 ${form.turno === t ? "btn-primary" : "btn-ghost"}`}
                  >
                    {t}º
                  </Button>
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
                    <Button
                      key={op}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() =>
                        setOperacoes(
                          marcado ? operacoes.filter((o) => o !== op) : [...operacoes, op],
                        )
                      }
                      className={`btn-base ${marcado ? "btn-primary" : "btn-ghost"}`}
                    >
                      {op}
                    </Button>
                  );
                })}
              </div>
            </div>
          </fieldset>

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
            <Button type="submit" className="btn-base btn-primary h-auto" disabled={mutation.isPending}>
              {mutation.isPending ? "Lançando…" : "Lançar dados"}
            </Button>
            <Button
              type="button"
              className="btn-base btn-ghost h-auto"
              disabled={mutation.isPending}
              onClick={() => {
                setForm(vazio);
                setOperacoes([]);
                setErros([]);
                setSucesso(null);
              }}
            >
              Limpar
            </Button>
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
                    {nomeDaCelula(celulas.data, r.celula)} · {r.operador}
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
      <AlertDialog open={confirmarAtraso} onOpenChange={(aberto) => { if (!mutation.isPending) setConfirmarAtraso(aberto); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-lg bg-surface p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-left">
              <AlertTriangle className="size-6 shrink-0 text-warning" /> Lançamento fora do horário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-base leading-relaxed">
              Atenção: o ferrolho selecionado está sendo lançado fora do horário de medição previsto na escala ativa. Deseja confirmar o lançamento mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="break-words text-sm leading-relaxed text-muted-foreground">
            {nomeDaCelula(celulas.data, Number(form.celula))} · {form.operador}
          </p>
          {erros.length > 0 && <p role="alert" className="text-sm text-destructive">{erros.join(" ")}</p>}
          <AlertDialogFooter className="gap-3">
            <Button variant="outline" disabled={mutation.isPending} onClick={() => { setConfirmarAtraso(false); setErros([]); }}>Cancelar</Button>
            <Button className="btn-primary h-auto whitespace-normal" disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>
              {mutation.isPending ? "Lançando…" : "Confirmar lançamento"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
