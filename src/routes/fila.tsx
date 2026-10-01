import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { abertosQuery } from "@/lib/dados";
import { duracaoMinutos, formatarDuracao, formatarHora } from "@/lib/constantes";

export const Route = createFileRoute("/fila")({
  head: () => ({
    meta: [
      { title: "Fila da tridimensional | Trivium Qualidade" },
      { name: "description", content: "Ferrolhos aguardando medição na tridimensional Zeiss, atualizado em tempo real." },
      { property: "og:title", content: "Fila da tridimensional | Trivium Qualidade" },
      { property: "og:description", content: "Tela de acompanhamento da fila de medição em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Fila,
});

function Fila() {
  const { data = [], isPending } = useQuery({ ...abertosQuery, refetchInterval: 30000 });
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell
      titulo="Fila da tridimensional"
      descricao="Atualização automática — ideal para deixar aberta em uma TV do setor."
      acao={<span className="chip">{data.length} aguardando</span>}
    >
      {isPending ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : data.length === 0 ? (
        <div className="panel p-10 text-center text-lg text-muted-foreground">Nenhum ferrolho aguardando medição.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r, i) => {
            const min = duracaoMinutos(r.hora_entrada);
            return (
              <div key={r.id} className={`panel p-5 ${i === 0 ? "ring-2 ring-accent" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-4xl font-bold text-accent">#{i + 1}</span>
                  <span className="chip">{r.status}</span>
                </div>
                <p className="mt-3 font-display text-xl font-bold">{r.modelo}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Célula {r.celula} · {r.operacao} · Turno {r.turno}
                </p>
                <p className="mt-1 text-sm">{r.operador}</p>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrada {formatarHora(r.hora_entrada)}</span>
                  <span className={min > 60 ? "font-semibold text-destructive" : "font-semibold"}>
                    {formatarDuracao(r.hora_entrada)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
