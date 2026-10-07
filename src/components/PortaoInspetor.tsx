import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";

import {
  entrarInspetor,
  listarInspetoresLogin,
  sairInspetor,
  statusInspetor,
} from "@/lib/inspetor.functions";
import mascote from "@/assets/mascote-trivium.png.asset.json";

export function usePortaoInspetor() {
  const status = useServerFn(statusInspetor);
  return useQuery({ queryKey: ["inspetor"], queryFn: () => status({}) });
}

export function BotaoSairInspetor() {
  const sair = useServerFn(sairInspetor);
  const { data } = usePortaoInspetor();
  const queryClient = useQueryClient();
  return (
    <div className="flex items-center gap-3">
      {data?.nome && (
        <span className="text-sm text-muted-foreground">
          Inspetor: <strong className="text-foreground">{data.nome}</strong>
        </span>
      )}
      <button
        className="btn-base btn-ghost"
        onClick={async () => {
          await sair({});
          await queryClient.invalidateQueries({ queryKey: ["inspetor"] });
        }}
      >
        Sair
      </button>
    </div>
  );
}

export function FormLoginInspetor({ compacto }: { compacto?: boolean }) {
  const entrar = useServerFn(entrarInspetor);
  const listar = useServerFn(listarInspetoresLogin);
  const inspetores = useQuery({ queryKey: ["inspetores-login"], queryFn: () => listar({}) });
  const queryClient = useQueryClient();
  const [inspetorId, setInspetorId] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => entrar({ data: { inspetorId, senha } }),
    onSuccess: async (res) => {
      if (res.ok) {
        setSenha("");
        setErro(null);
        await queryClient.invalidateQueries({ queryKey: ["inspetor"] });
      } else {
        setErro("Inspetor ou senha incorretos.");
      }
    },
    onError: () => setErro("Não foi possível validar a senha."),
  });

  return (
    <div>
      <form
        className={`flex flex-col gap-3 ${compacto ? "sm:flex-row" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <select
          className="control"
          aria-label="Inspetor"
          value={inspetorId}
          onChange={(e) => setInspetorId(e.target.value)}
        >
          <option value="">Selecione o inspetor…</option>
          {inspetores.data?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
        <input
          type="password"
          className="control"
          placeholder="Senha"
          value={senha}
          autoComplete="current-password"
          onChange={(e) => setSenha(e.target.value)}
        />
        <button className="btn-base btn-primary" disabled={mutation.isPending || !senha || !inspetorId}>
          Entrar
        </button>
      </form>
      {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
    </div>
  );
}

export function PortaoInspetor({ children }: { children: ReactNode }) {
  const { data, isPending } = usePortaoInspetor();

  if (isPending) {
    return <div className="panel p-8 text-sm text-muted-foreground">Verificando acesso…</div>;
  }

  if (data?.liberado) return <>{children}</>;

  return (
    <div className="panel mx-auto flex max-w-2xl flex-col items-center gap-6 p-10 text-center sm:flex-row sm:text-left">
      <img src={mascote.url} alt="" className="h-40 object-contain" />
      <div className="w-full">
        <span className="chip">Área restrita</span>
        <h2 className="mt-3 text-xl font-bold">Acesso do inspetor</h2>
        <p className="mt-2 mb-5 text-sm text-muted-foreground">
          Escolha seu nome e informe sua senha individual para continuar.
        </p>
        <FormLoginInspetor />
      </div>
    </div>
  );
}
