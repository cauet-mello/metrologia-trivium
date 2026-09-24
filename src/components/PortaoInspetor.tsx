import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";

import { entrarInspetor, sairInspetor, statusInspetor } from "@/lib/inspetor.functions";
import mascote from "@/assets/mascote-trivium.png.asset.json";

export function usePortaoInspetor() {
  const status = useServerFn(statusInspetor);
  return useQuery({ queryKey: ["inspetor"], queryFn: () => status({}) });
}

export function BotaoSairInspetor() {
  const sair = useServerFn(sairInspetor);
  const queryClient = useQueryClient();
  return (
    <button
      className="btn-base btn-ghost"
      onClick={async () => {
        await sair({});
        await queryClient.invalidateQueries({ queryKey: ["inspetor"] });
      }}
    >
      Sair da área do inspetor
    </button>
  );
}

export function PortaoInspetor({ children }: { children: ReactNode }) {
  const { data, isPending } = usePortaoInspetor();
  const entrar = useServerFn(entrarInspetor);
  const queryClient = useQueryClient();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => entrar({ data: { senha } }),
    onSuccess: async (res) => {
      if (res.ok) {
        setSenha("");
        setErro(null);
        await queryClient.invalidateQueries({ queryKey: ["inspetor"] });
      } else {
        setErro("Senha incorreta.");
      }
    },
    onError: () => setErro("Não foi possível validar a senha."),
  });

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
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é usada apenas pelos inspetores da qualidade. Informe a senha para continuar.
        </p>
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <input
            type="password"
            className="control"
            placeholder="Senha do inspetor"
            value={senha}
            autoComplete="current-password"
            onChange={(e) => setSenha(e.target.value)}
          />
          <button className="btn-base btn-primary" disabled={mutation.isPending || !senha}>
            Entrar
          </button>
        </form>
        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
      </div>
    </div>
  );
}
