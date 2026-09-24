import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-trivium-lt.png.asset.json";
import marca from "@/assets/marca-trivium.png.asset.json";

const NAV = [
  { to: "/", label: "Lançamento" },
  { to: "/fechamento", label: "Fechamento" },
  { to: "/cadastros", label: "Cadastros" },
  { to: "/painel", label: "Painel" },
  { to: "/fila", label: "Fila" },
] as const;

export function AppShell({
  titulo,
  descricao,
  children,
  acao,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
  acao?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const channel = supabase
      .channel("registros-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros" }, () => {
        queryClient.invalidateQueries({ queryKey: ["registros"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-surface/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
          <img src={marca.url} alt="" className="h-9 w-9 object-contain" />
          <div className="mr-auto leading-tight">
            <p className="font-display text-[0.68rem] font-semibold tracking-[0.2em] text-accent uppercase">
              Trivium · Qualidade
            </p>
            <p className="font-display text-base font-bold">Controle de Ferrolhos · Zeiss</p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => {
              const ativo = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2 font-display text-xs font-semibold tracking-wider uppercase transition-colors ${
                    ativo
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7 flex flex-wrap items-end gap-4">
          <div className="mr-auto">
            <h1 className="text-2xl font-bold">{titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
          </div>
          {acao}
        </div>
        {children}
      </main>

      <footer className="mx-auto flex max-w-7xl items-center gap-3 px-5 pb-8 text-xs text-muted-foreground">
        <img src={logo.url} alt="Trivium" className="h-5 object-contain opacity-70" />
        <span>Setor de Qualidade · Medição tridimensional</span>
      </footer>
    </div>
  );
}
