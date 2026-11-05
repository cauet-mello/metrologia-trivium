import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Save } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BotaoSairInspetor, PortaoInspetor } from "@/components/PortaoInspetor";
import {
  celulasQuery,
  escalasQuery,
  modelosQuery,
  operacoesQuery,
  operadoresQuery,
  statusQuery,
  turnosQuery,
  rotuloCelula,
} from "@/lib/dados";
import {
  definirEscalaAtiva,
  editarCadastro,
  listarInspetores,
  removerItem,
  salvarCelula,
  salvarInspetor,
  salvarItemSimples,
  salvarModelo,
  salvarOperador,
  trocarSenhaInspetor,
} from "@/lib/inspetor.functions";

export const Route = createFileRoute("/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros | Trivium Qualidade" },
      { name: "description", content: "Gerencie operadores, modelos, células, status, operações, turnos, inspetores e escalas." },
      { property: "og:title", content: "Cadastros | Trivium Qualidade" },
      { property: "og:description", content: "Listas e configurações do controle de ferrolhos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadastros,
});

function Cadastros() {
  return (
    <AppShell titulo="Cadastros" descricao="Mantenha atualizadas as listas usadas no lançamento.">
      <PortaoInspetor>
        <div className="mb-5 flex justify-end">
          <BotaoSairInspetor />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <EscalaAtiva />
          <Inspetores />
          <Simples titulo="Status" tabela="status_opcoes" query={statusQuery} placeholder="Novo status" />
          <Simples titulo="Operações Medidas" tabela="operacoes" query={operacoesQuery} placeholder="Ex.: OP80" />
          <Simples titulo="Turnos" tabela="turnos" query={turnosQuery} placeholder="Ex.: 4" />
          <Operadores />
          <Modelos />
          <Celulas />
        </div>
      </PortaoInspetor>
    </AppShell>
  );
}

function useAcao() {
  const qc = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function rodar(fn: () => Promise<unknown>, chave: string) {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: [chave] });
      await qc.invalidateQueries({ queryKey: ["alteracoes"] });
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      return false;
    } finally {
      setOcupado(false);
    }
  }
  return { erro, ocupado, rodar };
}

function Lista({ itens, tabela }: { itens: { id: string; texto: string; nome?: string | null; codigo?: number; numero?: number; onRemover: () => void }[]; tabela: Tabela }) {
  return (
    <ul className="mt-4 max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
      {itens.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm leading-relaxed">
          <span className="mr-auto min-w-0 flex-1 basis-40 break-words">{i.texto}</span>
          <EditarCadastro tabela={tabela} item={i} />
          <button
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={() => confirm(`Remover "${i.texto}"?`) && i.onRemover()}
          >
            Remover
          </button>
        </li>
      ))}
    </ul>
  );
}

type Tabela = "operadores" | "modelos" | "celulas" | "status_opcoes" | "operacoes" | "turnos" | "inspetores";

function EditarCadastro({ tabela, item }: { tabela: Tabela; item: { id: string; nome?: string | null; codigo?: number; numero?: number } }) {
  const salvar = useServerFn(editarCadastro);
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const { erro, ocupado, rodar } = useAcao();
  return (
    <Dialog open={aberto} onOpenChange={(valor) => { if (!ocupado) setAberto(valor); }}>
      <Button type="button" variant="ghost" size="sm" title="Editar cadastro" className="shrink-0" onClick={() => {
        setNome(item.nome ?? "");
        setNumero(String(item.codigo ?? item.numero ?? ""));
        setAberto(true);
      }}><Pencil />Editar</Button>
      <DialogContent className="max-w-[min(32rem,calc(100%-2rem))]" aria-describedby={undefined}>
        <DialogTitle>Editar cadastro</DialogTitle>
        <form className="grid gap-4" onSubmit={async (e) => {
          e.preventDefault();
          const dados = tabela === "celulas"
            ? { tabela, id: item.id, numero: Number(numero), nome } as const
            : tabela === "modelos"
              ? { tabela, id: item.id, nome, codigo: Number(numero) } as const
              : { tabela, id: item.id, nome };
          if (await rodar(() => salvar({ data: dados }), tabela)) {
            if (tabela === "inspetores") await Promise.all([
              qc.invalidateQueries({ queryKey: ["inspetores-login"] }),
              qc.invalidateQueries({ queryKey: ["inspetor"] }),
            ]);
            setAberto(false);
          }
        }}>
          {tabela !== "celulas" && <label className="grid gap-2 text-sm">{tabela === "modelos" ? "Descrição" : "Nome"}
            <input className="control" required minLength={["operadores", "inspetores", "modelos"].includes(tabela) ? 3 : 1} maxLength={200} value={nome} disabled={ocupado} onChange={(e) => setNome(e.target.value)} />
          </label>}
          {(tabela === "modelos" || (tabela === "celulas" && (item.numero ?? 0) > 0)) && <label className="grid gap-2 text-sm">{tabela === "modelos" ? "Código" : "Número da célula"}
            <input className="control" type="number" required min={1} step={1} value={numero} disabled={ocupado} onChange={(e) => setNumero(e.target.value)} />
          </label>}
          {tabela === "celulas" && <label className="grid gap-2 text-sm">Nome (opcional)
            <input className="control" maxLength={60} placeholder="Ex.: Brochadeira 47" value={nome} disabled={ocupado} onChange={(e) => setNome(e.target.value)} />
          </label>}
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={ocupado} onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" disabled={ocupado}><Save />{ocupado ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useRemover() {
  const fn = useServerFn(removerItem);
  return (tabela: Tabela, id: string) => fn({ data: { tabela, id } });
}

function Simples({
  titulo,
  tabela,
  query,
  placeholder,
}: {
  titulo: string;
  tabela: "status_opcoes" | "operacoes" | "turnos";
  query: { queryKey: string[]; queryFn: () => Promise<{ id: string; nome: string }[]> };
  placeholder: string;
}) {
  const { data = [] } = useQuery(query);
  const salvar = useServerFn(salvarItemSimples);
  const remover = useRemover();
  const { erro, ocupado, rodar } = useAcao();
  const [nome, setNome] = useState("");
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">{titulo} <span className="chip ml-2">{data.length}</span></h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await rodar(() => salvar({ data: { tabela, nome } }), tabela)) setNome("");
        }}
      >
        <input className="control" placeholder={placeholder} value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="btn-base btn-primary" disabled={ocupado || !nome}>Adicionar</button>
      </form>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <Lista tabela={tabela} itens={data.map((o) => ({ ...o, texto: o.nome, onRemover: () => rodar(() => remover(tabela, o.id), tabela) }))} />
    </section>
  );
}

function EscalaAtiva() {
  const { data } = useQuery(escalasQuery);
  const salvar = useServerFn(definirEscalaAtiva);
  const { erro, ocupado, rodar } = useAcao();
  const escalas = [...new Set((data?.horarios ?? []).map((h) => h.escala))];
  const ativa = data?.ativa ?? "";
  const horarios = (data?.horarios ?? []).filter((h) => h.escala === ativa);
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Escala de medição</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Define os horários usados para marcar Atraso automaticamente (faixa ±10 min).
      </p>
      <select
        className="control mt-4"
        value={ativa}
        disabled={ocupado}
        onChange={(e) => rodar(() => salvar({ data: { escala: e.target.value } }), "escalas")}
      >
        <option value="">Nenhuma (sem atraso automático)</option>
        {escalas.map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      {horarios.length > 0 && (
        <ul className="mt-4 max-h-64 divide-y divide-border/60 overflow-y-auto text-xs">
          {horarios.map((h, i) => (
            <li key={i} className="flex gap-2 py-1.5">
              <span className="w-8 text-muted-foreground">{h.turno}º</span>
              <span className="w-24">{h.inicio.slice(0, 5)}–{h.fim.slice(0, 5)}</span>
              <span className="text-muted-foreground">Cél. {h.celulas.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Inspetores() {
  const listar = useServerFn(listarInspetores);
  const { data = [] } = useQuery({ queryKey: ["inspetores"], queryFn: () => listar({}) });
  const salvar = useServerFn(salvarInspetor);
  const trocar = useServerFn(trocarSenhaInspetor);
  const remover = useRemover();
  const { erro, ocupado, rodar } = useAcao();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Inspetores <span className="chip ml-2">{data.length}</span></h2>
      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await rodar(() => salvar({ data: { nome, senha } }), "inspetores")) {
            setNome("");
            setSenha("");
          }
        }}
      >
        <input className="control" placeholder="Nome do inspetor" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="flex gap-2">
          <input type="password" className="control" placeholder="Senha (mín. 6)" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <button className="btn-base btn-primary" disabled={ocupado || !nome || !senha}>Adicionar</button>
        </div>
      </form>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <ul className="mt-4 divide-y divide-border/60">
        {data.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="mr-auto min-w-0 break-words">{i.nome}</span>
            <EditarCadastro tabela="inspetores" item={i} />
            <button
              className="text-xs text-muted-foreground hover:text-accent"
              onClick={() => {
                const nova = prompt(`Nova senha para ${i.nome} (mín. 6 caracteres):`);
                if (nova) rodar(() => trocar({ data: { id: i.id, senha: nova } }), "inspetores");
              }}
            >
              Trocar senha
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => confirm(`Remover "${i.nome}"?`) && rodar(() => remover("inspetores", i.id), "inspetores")}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Operadores() {
  const { data = [] } = useQuery(operadoresQuery);
  const salvar = useServerFn(salvarOperador);
  const remover = useRemover();
  const { erro, ocupado, rodar } = useAcao();
  const [nome, setNome] = useState("");
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Operadores <span className="chip ml-2">{data.length}</span></h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await rodar(() => salvar({ data: { nome } }), "operadores")) setNome("");
        }}
      >
        <input className="control" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="btn-base btn-primary" disabled={ocupado || !nome}>Adicionar</button>
      </form>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <Lista tabela="operadores" itens={data.map((o) => ({ ...o, texto: o.nome, onRemover: () => rodar(() => remover("operadores", o.id), "operadores") }))} />
    </section>
  );
}

function Modelos() {
  const { data = [] } = useQuery(modelosQuery);
  const salvar = useServerFn(salvarModelo);
  const remover = useRemover();
  const { erro, ocupado, rodar } = useAcao();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Modelos <span className="chip ml-2">{data.length}</span></h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await rodar(() => salvar({ data: { codigo: Number(codigo), nome } }), "modelos")) {
            setCodigo("");
            setNome("");
          }
        }}
      >
        <input className="control w-28" placeholder="Código" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <input className="control" placeholder="Descrição" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="btn-base btn-primary" disabled={ocupado || !nome || !codigo}>Adicionar</button>
      </form>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <Lista tabela="modelos" itens={data.map((m) => ({ ...m, texto: `${m.codigo} · ${m.nome}`, onRemover: () => rodar(() => remover("modelos", m.id), "modelos") }))} />
    </section>
  );
}

function Celulas() {
  const { data = [] } = useQuery(celulasQuery);
  const salvar = useServerFn(salvarCelula);
  const remover = useRemover();
  const { erro, ocupado, rodar } = useAcao();
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Células <span className="chip ml-2">{data.length}</span></h2>
      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await rodar(() => salvar({ data: { numero: numero.trim() ? Number(numero) : null, nome } }), "celulas")) {
            setNumero("");
            setNome("");
          }
        }}
      >
        <input className="control" placeholder="Nome (ex.: Brochadeira 47)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="flex gap-2">
          <input className="control" placeholder="Número (opcional)" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
          <button className="btn-base btn-primary" disabled={ocupado || (!numero.trim() && !nome.trim())}>Adicionar</button>
        </div>
      </form>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <Lista tabela="celulas" itens={data.map((c) => ({ ...c, texto: rotuloCelula(c), onRemover: () => rodar(() => remover("celulas", c.id), "celulas") }))} />
    </section>
  );
}
