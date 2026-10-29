import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-trivium-lt.png.asset.json";
import logoWordmark from "@/assets/logo-trivium-lt-2.png.asset.json";

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
          <div className="mr-auto flex min-w-0 flex-wrap items-center gap-4">
            <span className="flex shrink-0 items-center rounded-md bg-primary-foreground px-3 py-1.5">
              <img src={logoWordmark.url} alt="Trivium" className="h-6 w-auto object-contain" />
            </span>
            <div className="min-w-0 space-y-1 leading-relaxed">
              <p className="font-display text-xs font-semibold text-accent uppercase">
                SISTEMA DE QUALIDADE
              </p>
              <p className="font-display text-base font-bold">Controle Tridimensional · Zeiss</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Navegação principal">
            {NAV.map((item) => {
              const ativo = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-3 font-display text-xs font-semibold uppercase transition-colors ${
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
          <div className="mr-auto min-w-0">
            <h1 className="text-2xl font-bold">{titulo}</h1>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">{descricao}</p>
          </div>
          {acao}
        </div>
        {children}
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 pb-8 text-sm text-muted-foreground">
        <img src={logo.url} alt="Trivium" className="h-5 object-contain opacity-70" />
        <span>Setor de Qualidade · Medição Tridimensional</span>
      </footer>
    </div>
  );
}
