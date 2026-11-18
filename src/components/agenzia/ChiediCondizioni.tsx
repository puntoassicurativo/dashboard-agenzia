/**
 * Amministrazione > Chiedi alle condizioni (single plan of 18/11/2026, P6). Everyone.
 * The question goes into the Supabase table domande_condizioni; the Telegram bot process on the agency PC answers it
 * with the same library and citations of the bot, and writes the answer back. The Claude key never reaches the browser.
 * One question at a time, no follow-up. RLS: each user sees only their own questions.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { Pagina } from "./Lato";

export interface Domanda {
  id: number;
  domanda: string;
  stato: "nuova" | "in_corso" | "risposta" | "errore";
  risposta: string | null;
  creata_il: string;
  risposta_il: string | null;
}

/** After this the question is still 'nuova': the PC that answers is probably off. */
export const ATTESA_MASSIMA_MS = 2 * 60 * 1000;
const AVVERTENZA =
  "Risposta preparata dall'AI sulle condizioni Vittoria. Prima di dirla al cliente controlla documento e pagina citati.";

const useDomande = () =>
  useQuery({
    queryKey: ["domande_condizioni"],
    queryFn: async (): Promise<Domanda[]> => {
      const { data, error } = await getSupabaseClient()
        .from("domande_condizioni")
        .select("id, domanda, stato, risposta, creata_il, risposta_il")
        .order("creata_il", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Domanda[];
    },
    retry: false, // no table yet (service not switched on): say it at once
    // while a question waits, look again every 5 seconds
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (d) => d.stato === "nuova" || d.stato === "in_corso",
      )
        ? 5000
        : false,
  });

export const statoDomanda = (d: Domanda, adesso: number): string | null => {
  if (d.stato === "risposta") return null;
  if (d.stato === "errore")
    return d.risposta ?? "Non sono riuscito a rispondere. Riprova tra poco.";
  if (
    d.stato === "nuova" &&
    adesso - new Date(d.creata_il).getTime() > ATTESA_MASSIMA_MS
  )
    return "Il PC dell'agenzia che risponde sembra spento, riprova più tardi.";
  return "Ci sto pensando...";
};

export const SchedaDomanda = ({
  d,
  adesso,
}: {
  d: Domanda;
  adesso: number;
}) => {
  const attesa = statoDomanda(d, adesso);
  return (
    <div className="rounded-2xl border bg-card p-4 text-sm flex flex-col gap-2">
      <div className="font-semibold">{d.domanda}</div>
      {attesa ? (
        <div className="text-muted-foreground">{attesa}</div>
      ) : (
        <>
          <div className="whitespace-pre-wrap">{d.risposta}</div>
          <div className="text-xs text-muted-foreground border-t pt-2">
            {AVVERTENZA}
          </div>
        </>
      )}
    </div>
  );
};

export const ChiediCondizioni = () => {
  const qc = useQueryClient();
  const [testo, setTesto] = useState("");
  const q = useDomande();
  const invia = useMutation({
    mutationFn: async (domanda: string) => {
      const { error } = await getSupabaseClient()
        .from("domande_condizioni")
        .insert({ domanda });
      if (error) throw error;
    },
    onSuccess: () => {
      setTesto("");
      qc.invalidateQueries({ queryKey: ["domande_condizioni"] });
    },
  });
  const adesso = Date.now();
  const nonPronta = q.error != null;
  return (
    <Pagina
      titolo="Chiedi alle condizioni"
      sotto="Domande su garanzie, franchigie, scoperti, massimali ed esclusioni delle polizze Vittoria. Risponde lo stesso esperto del bot Telegram, citando documento e pagina."
    >
      {nonPronta ? (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Non ancora disponibile: la pagina si attiva quando Lorenzo accende il
          servizio sul PC dell'agenzia.
        </div>
      ) : (
        <form
          className="rounded-2xl border bg-card p-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (testo.trim().length >= 3) invia.mutate(testo.trim());
          }}
        >
          <label htmlFor="domanda" className="text-sm font-medium">
            La tua domanda
          </label>
          <textarea
            id="domanda"
            className="w-full rounded-md border bg-background p-2 text-sm"
            rows={3}
            maxLength={2000}
            placeholder="Per esempio: che franchigia c'è sull'acqua condotta nella Casa e Famiglia?"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={invia.isPending || testo.trim().length < 3}
              className="rounded-md bg-pa-blu px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {invia.isPending ? "Invio..." : "Chiedi"}
            </button>
            {invia.error && (
              <span className="text-sm text-pa-rosso">
                Domanda non inviata, riprova.
              </span>
            )}
          </div>
        </form>
      )}
      {(q.data ?? []).map((d) => (
        <SchedaDomanda key={d.id} d={d} adesso={adesso} />
      ))}
    </Pagina>
  );
};
