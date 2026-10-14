import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";

type InspetorSession = { inspetorId?: string; nome?: string };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "trivium-inspetor-v2",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", partitioned: true },
  };
}

function gerarHash(senha: string) {
  const sal = randomBytes(16).toString("hex");
  return `${sal}:${scryptSync(senha, sal, 64).toString("hex")}`;
}

function senhaConfere(senha: string, hash: string) {
  const [sal, h] = hash.split(":");
  if (!sal || !h) return false;
  const a = scryptSync(senha, sal, 64);
  const b = Buffer.from(h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function exigirInspetor(): Promise<string> {
  const session = await useSession<InspetorSession>(sessionConfig());
  if (!session.data.inspetorId || !session.data.nome)
    throw new Error("Área restrita ao inspetor. Informe sua senha.");
  return session.data.nome;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function registrarAlteracao(
  inspetor: string,
  tipo: string,
  registroId: number | null,
  anterior: string | null,
  novo: string | null,
) {
  const db = await admin();
  await db.from("alteracoes").insert({
    inspetor,
    perfil: "Inspetor",
    tipo,
    registro_id: registroId,
    anterior,
    novo,
  });
}

export const statusInspetor = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<InspetorSession>(sessionConfig());
  return { liberado: !!session.data.inspetorId, nome: session.data.nome ?? null };
});

export const listarInspetoresLogin = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db
    .from("inspetores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return data;
});

export const entrarInspetor = createServerFn({ method: "POST" })
  .inputValidator((data: { inspetorId: string; senha: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: insp } = await db
      .from("inspetores")
      .select("id, nome, senha_hash, ativo")
      .eq("id", data.inspetorId)
      .maybeSingle();
    if (!insp || !insp.ativo || !senhaConfere(data.senha ?? "", insp.senha_hash))
      return { ok: false as const };
    const session = await useSession<InspetorSession>(sessionConfig());
    await session.update({ inspetorId: insp.id, nome: insp.nome });
    return { ok: true as const };
  });

export const sairInspetor = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<InspetorSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const fecharRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; observacoes?: string; atraso?: boolean }) => data)
  .handler(async ({ data }) => {
    const nome = await exigirInspetor();
    const db = await admin();
    const { data: reg } = await db.from("registros").select("atraso").eq("id", data.id).single();
    const { error } = await db
      .from("registros")
      .update({
        hora_saida: new Date().toISOString(),
        observacoes: data.observacoes?.trim() || null,
        atraso: data.atraso === true || reg?.atraso === true,
      })
      .eq("id", data.id)
      .is("hora_saida", null);
    if (error) throw new Error(error.message);
    await registrarAlteracao(nome, "Fechamento", data.id, null, data.atraso ? "Atraso manual" : null);
    return { ok: true as const };
  });

export const moverFila = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; fila: "Zeiss 1" | "Zeiss 2"; anterior: string }) => {
    if (data.fila !== "Zeiss 1" && data.fila !== "Zeiss 2") throw new Error("Fila inválida.");
    return data;
  })
  .handler(async ({ data }) => {
    const nome = await exigirInspetor();
    const db = await admin();
    const { error } = await db.from("registros").update({ fila: data.fila }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAlteracao(nome, "Fila", data.id, data.anterior, data.fila);
    return { ok: true as const };
  });

export const alterarSaida = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; hora_saida: string }) => data)
  .handler(async ({ data }) => {
    const nome = await exigirInspetor();
    const nova = new Date(data.hora_saida);
    if (Number.isNaN(nova.getTime())) throw new Error("Horário inválido.");
    const db = await admin();
    const { data: reg, error: e1 } = await db
      .from("registros")
      .select("hora_entrada, hora_saida")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    if (nova.getTime() < new Date(reg.hora_entrada).getTime())
      throw new Error("A saída não pode ser antes da entrada.");
    const { error } = await db
      .from("registros")
      .update({ hora_saida: nova.toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAlteracao(nome, "Horário de saída", data.id, reg.hora_saida, nova.toISOString());
    return { ok: true as const };
  });

export const listarAlteracoes = createServerFn({ method: "GET" }).handler(async () => {
  await exigirInspetor();
  const db = await admin();
  const { data, error } = await db
    .from("alteracoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return data;
});

// ---------- Cadastros ----------

function erroDuplicado(error: { code?: string; message: string }, msg: string) {
  return new Error(error.code === "23505" ? msg : error.message);
}

export const salvarOperador = createServerFn({ method: "POST" })
  .inputValidator((data: { nome: string }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    const nome = data.nome.trim().toUpperCase();
    if (nome.length < 3) throw new Error("Informe o nome completo do operador.");
    const db = await admin();
    const { error } = await db.from("operadores").insert({ nome });
    if (error) throw erroDuplicado(error, "Esse operador já está cadastrado.");
    return { ok: true as const };
  });

export const salvarModelo = createServerFn({ method: "POST" })
  .inputValidator((data: { codigo: number; nome: string }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    const nome = data.nome.trim().toUpperCase();
    if (!Number.isInteger(data.codigo) || data.codigo <= 0) throw new Error("Código inválido.");
    if (nome.length < 3) throw new Error("Informe a descrição do modelo.");
    const db = await admin();
    const { error } = await db.from("modelos").insert({ codigo: data.codigo, nome });
    if (error) throw erroDuplicado(error, "Esse código já existe.");
    return { ok: true as const };
  });

export const salvarCelula = createServerFn({ method: "POST" })
  .inputValidator((data: { numero: number }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    if (!Number.isInteger(data.numero) || data.numero <= 0) throw new Error("Número inválido.");
    const db = await admin();
    const { error } = await db.from("celulas").insert({ numero: data.numero });
    if (error) throw erroDuplicado(error, "Essa célula já existe.");
    return { ok: true as const };
  });

const TABELAS_SIMPLES = ["status_opcoes", "operacoes", "turnos"] as const;
type TabelaSimples = (typeof TABELAS_SIMPLES)[number];

export const salvarItemSimples = createServerFn({ method: "POST" })
  .inputValidator((data: { tabela: TabelaSimples; nome: string }) => {
    if (!TABELAS_SIMPLES.includes(data.tabela)) throw new Error("Cadastro inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    await exigirInspetor();
    const nome = data.nome.trim();
    if (!nome) throw new Error("Informe o nome.");
    const db = await admin();
    const { error } = await db.from(data.tabela).insert({ nome });
    if (error) throw erroDuplicado(error, "Esse item já está cadastrado.");
    return { ok: true as const };
  });

const TABELAS_REMOVIVEIS = [
  "operadores",
  "modelos",
  "celulas",
  "status_opcoes",
  "operacoes",
  "turnos",
  "inspetores",
] as const;

export const editarCadastro = createServerFn({ method: "POST" })
  .inputValidator((input) => z.discriminatedUnion("tabela", [
    z.object({ tabela: z.literal("operadores"), id: z.string().uuid(), nome: z.string().trim().min(3).max(200) }),
    z.object({ tabela: z.literal("modelos"), id: z.string().uuid(), nome: z.string().trim().min(3).max(200), codigo: z.number().int().positive() }),
    z.object({ tabela: z.literal("celulas"), id: z.string().uuid(), numero: z.number().int().positive() }),
    z.object({ tabela: z.enum(["status_opcoes", "operacoes", "turnos"]), id: z.string().uuid(), nome: z.string().trim().min(1).max(200) }),
    z.object({ tabela: z.literal("inspetores"), id: z.string().uuid(), nome: z.string().trim().min(3).max(200) }),
  ]).parse(input))
  .handler(async ({ data }) => {
    const quem = await exigirInspetor();
    const db = await admin();
    const colunas = data.tabela === "modelos" ? "id, nome, codigo" : data.tabela === "celulas" ? "id, numero" : "id, nome";
    const { data: anterior, error: leitura } = await db.from(data.tabela).select(colunas).eq("id", data.id).single();
    if (leitura || !anterior) throw new Error("Cadastro não encontrado. Atualize a página e tente novamente.");
    const resultado = data.tabela === "celulas"
      ? await db.from("celulas").update({ numero: data.numero }).eq("id", data.id).select("id, numero").single()
      : data.tabela === "modelos"
        ? await db.from("modelos").update({ nome: data.nome.toUpperCase(), codigo: data.codigo }).eq("id", data.id).select("id, nome, codigo").single()
        : await db.from(data.tabela).update({ nome: ["operadores", "inspetores"].includes(data.tabela) ? data.nome.toUpperCase() : data.nome }).eq("id", data.id).select("id, nome").single();
    const { data: novo, error } = resultado;
    if (error) throw erroDuplicado(error, "Já existe um cadastro com esse nome, código ou número.");
    await registrarAlteracao(quem, `Edição em ${data.tabela}`, null, JSON.stringify(anterior), JSON.stringify(novo));
    if (data.tabela === "inspetores") {
      const session = await useSession<InspetorSession>(sessionConfig());
      if (session.data.inspetorId === data.id) await session.update({ nome: data.nome.toUpperCase() });
    }
    return { ok: true as const };
  });

export const removerItem = createServerFn({ method: "POST" })
  .inputValidator((data: { tabela: (typeof TABELAS_REMOVIVEIS)[number]; id: string }) => {
    if (!TABELAS_REMOVIVEIS.includes(data.tabela)) throw new Error("Cadastro inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    const nome = await exigirInspetor();
    const db = await admin();
    if (data.tabela === "inspetores") {
      const { count } = await db
        .from("inspetores")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true);
      if ((count ?? 0) <= 1) throw new Error("Mantenha pelo menos um inspetor cadastrado.");
    }
    const { error } = await db.from(data.tabela).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAlteracao(nome, `Remoção em ${data.tabela}`, null, data.id, null);
    return { ok: true as const };
  });

export const listarInspetores = createServerFn({ method: "GET" }).handler(async () => {
  await exigirInspetor();
  const db = await admin();
  const { data, error } = await db.from("inspetores").select("id, nome, ativo").order("nome");
  if (error) throw new Error(error.message);
  return data;
});

export const salvarInspetor = createServerFn({ method: "POST" })
  .inputValidator((data: { nome: string; senha: string }) => data)
  .handler(async ({ data }) => {
    const quem = await exigirInspetor();
    const nome = data.nome.trim().toUpperCase();
    if (nome.length < 3) throw new Error("Informe o nome do inspetor.");
    if ((data.senha ?? "").length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
    const db = await admin();
    const { error } = await db.from("inspetores").insert({ nome, senha_hash: gerarHash(data.senha) });
    if (error) throw erroDuplicado(error, "Esse inspetor já está cadastrado.");
    await registrarAlteracao(quem, "Novo inspetor", null, null, nome);
    return { ok: true as const };
  });

export const trocarSenhaInspetor = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; senha: string }) => data)
  .handler(async ({ data }) => {
    const quem = await exigirInspetor();
    if ((data.senha ?? "").length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres.");
    const db = await admin();
    const { error } = await db
      .from("inspetores")
      .update({ senha_hash: gerarHash(data.senha) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAlteracao(quem, "Troca de senha de inspetor", null, data.id, null);
    return { ok: true as const };
  });

export const definirEscalaAtiva = createServerFn({ method: "POST" })
  .inputValidator((data: { escala: string }) => data)
  .handler(async ({ data }) => {
    const quem = await exigirInspetor();
    const db = await admin();
    const { data: atual } = await db
      .from("configuracoes")
      .select("valor")
      .eq("chave", "escala_ativa")
      .maybeSingle();
    const { error } = await db
      .from("configuracoes")
      .upsert({ chave: "escala_ativa", valor: data.escala });
    if (error) throw new Error(error.message);
    await registrarAlteracao(quem, "Escala ativa", null, atual?.valor ?? null, data.escala || null);
    return { ok: true as const };
  });
