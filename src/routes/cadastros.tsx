import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { BotaoSairInspetor, PortaoInspetor } from "@/components/PortaoInspetor";
import { celulasQuery, modelosQuery, operadoresQuery } from "@/lib/dados";
import {
  removerCelula,
  removerModelo,
  removerOperador,
  salvarCelula,
  salvarModelo,
  salvarOperador,
} from "@/lib/inspetor.functions";

export const Route = createFileRoute("/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros | Trivium Qualidade" },
      { name: "description", content: "Gerencie operadores, modelos de ferrolho e células CNC." },
      { property: "og:title", content: "Cadastros | Trivium Qualidade" },
      { property: "og:description", content: "Operadores, modelos e células do controle de ferrolhos." },
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

function Lista({ itens }: { itens: { id: string; texto: string; onRemover: () => void }[] }) {
  return (
    <ul className="mt-4 max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
      {itens.map((i) => (
        <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
          <span className="mr-auto">{i.texto}</span>
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

function Operadores() {
  const { data = [] } = useQuery(operadoresQuery);
  const salvar = useServerFn(salvarOperador);
  const remover = useServerFn(removerOperador);
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
      <Lista itens={data.map((o) => ({ id: o.id, texto: o.nome, onRemover: () => rodar(() => remover({ data: { id: o.id } }), "operadores") }))} />
    </section>
  );
}

function Modelos() {
  const { data = [] } = useQuery(modelosQuery);
  const salvar = useServerFn(salvarModelo);
  const remover = useServerFn(removerModelo);
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
      <Lista itens={data.map((m) => ({ id: m.id, texto: `${m.codigo} · ${m.nome}`, onRemover: () => rodar(() => remover({ data: { id: m.id } }), "modelos") }))} />
    </section>
  );
}

function Celulas() {
  const { data = [] } = useQuery(celulasQuery);
  const salvar = useServerFn(salvarCelula);
  const remover = useServerFn(removerCelula);
  const { erro, ocupado, rodar } = useAcao();
  const [numero, setNumero] = useState("");
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Células <span className="chip ml-2">{data.length}</span></h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await rodar(() => salvar({ data: { numero: Number(numero) } }), "celulas")) setNumero("");
        }}
      >
        <input className="control" placeholder="Número da célula" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <button className="btn-base btn-primary" disabled={ocupado || !numero}>Adicionar</button>
      </form>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <Lista itens={data.map((c) => ({ id: c.id, texto: `Célula ${c.numero}`, onRemover: () => rodar(() => remover({ data: { id: c.id } }), "celulas") }))} />
    </section>
  );
}
