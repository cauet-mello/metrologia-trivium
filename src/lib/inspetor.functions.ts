import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type InspetorSession = { liberado?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "trivium-inspetor",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", partitioned: true },
  };
}

function senhaConfere(informada: string, esperada: string): boolean {
  const a = createHash("sha256").update(informada, "utf8").digest();
  const b = createHash("sha256").update(esperada, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function exigirInspetor() {
  const session = await useSession<InspetorSession>(sessionConfig());
  if (!session.data.liberado) throw new Error("Área restrita ao inspetor. Informe a senha.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const statusInspetor = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<InspetorSession>(sessionConfig());
  return { liberado: session.data.liberado === true };
});

export const entrarInspetor = createServerFn({ method: "POST" })
  .inputValidator((data: { senha: string }) => data)
  .handler(async ({ data }) => {
    const esperada = process.env["INSPECTOR_PASSWORD"];
    if (!esperada) throw new Error("Senha do inspetor não configurada.");
    if (!senhaConfere(data.senha ?? "", esperada)) return { ok: false as const };
    const session = await useSession<InspetorSession>(sessionConfig());
    await session.update({ liberado: true });
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
    await exigirInspetor();
    const db = await admin();
    const { error } = await db
      .from("registros")
      .update({
        hora_saida: new Date().toISOString(),
        observacoes: data.observacoes?.trim() || null,
        atraso: data.atraso === true,
      })
      .eq("id", data.id)
      .is("hora_saida", null);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const salvarOperador = createServerFn({ method: "POST" })
  .inputValidator((data: { nome: string }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    const nome = data.nome.trim().toUpperCase();
    if (nome.length < 3) throw new Error("Informe o nome completo do operador.");
    const db = await admin();
    const { error } = await db.from("operadores").insert({ nome });
    if (error) {
      throw new Error(
        error.code === "23505" ? "Esse operador já está cadastrado." : error.message,
      );
    }
    return { ok: true as const };
  });

export const removerOperador = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    const db = await admin();
    const { error } = await db.from("operadores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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
    if (error) {
      throw new Error(error.code === "23505" ? "Esse código já existe." : error.message);
    }
    return { ok: true as const };
  });

export const removerModelo = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    const db = await admin();
    const { error } = await db.from("modelos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const salvarCelula = createServerFn({ method: "POST" })
  .inputValidator((data: { numero: number }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    if (!Number.isInteger(data.numero) || data.numero <= 0) throw new Error("Número inválido.");
    const db = await admin();
    const { error } = await db.from("celulas").insert({ numero: data.numero });
    if (error) {
      throw new Error(error.code === "23505" ? "Essa célula já existe." : error.message);
    }
    return { ok: true as const };
  });

export const removerCelula = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await exigirInspetor();
    const db = await admin();
    const { error } = await db.from("celulas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
