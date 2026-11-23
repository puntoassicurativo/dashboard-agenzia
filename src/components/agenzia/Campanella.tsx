/**
 * Bell at the top right of the dashboard (Lorenzo 22/11/2026: "attention, the decade is missing", "attention, there is this
 * problem", or "there are no notifications"). Only inside the dashboard: the mails of today stay.
 * The morning run writes the notifications (agenti\cruscotto_agenzia\notifiche.py): one row for everyone without amounts
 * (sezione_info "NOT") and one for the partners (andamento_blocchi "notifiche", RLS: partners only). The page adds by itself
 * "run not done", because a run that did not go cannot say so, and hides "decade missing" when its files are already
 * uploaded and waiting for the next run.
 */
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link } from "react-router";
import { z } from "zod";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useAccessoUtile } from "./accesso";
import { useCaricamenti } from "./caricamentiDati";
import { mesiInLettere } from "./formato";

export interface Notifica {
  livello: "attenzione" | "info";
  chiave: string;
  titolo: string;
  testo: string;
  link: string | null;
}

const SCHEMA_NOTIFICA = z.object({
  livello: z.enum(["attenzione", "info"]).catch("attenzione"),
  chiave: z.string(),
  titolo: z.string(),
  testo: z.string().catch(""),
  link: z.string().nullable().catch(null),
});

/** Keeps only well-formed notifications: a bad row must hide one line, not break the header (review R015). */
export const notificheValide = (valore: unknown): Notifica[] =>
  Array.isArray(valore)
    ? valore.flatMap((v) => {
        const r = SCHEMA_NOTIFICA.safeParse(v);
        return r.success ? [r.data] : [];
      })
    : [];

/** A colleague cannot open Carica file: no link, and the text says who does it (review R065). */
export const perChiNonESocio = (n: Notifica): Notifica =>
  n.link?.startsWith("/carica-file")
    ? { ...n, link: null, testo: `${n.testo} La carica un socio.`.trim() }
    : n;

/** The morning run starts at 6:30; from 8 its notifications should be there. */
export const ORA_GIRO_FATTO = 8;

const useNotificheTutti = () =>
  useQuery({
    queryKey: ["notifiche", "tutti"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("sezione_info")
        .select("aggiornato_il, riepilogo")
        .eq("sezione", "NOT")
        .maybeSingle();
      if (error) throw error;
      const r = data as {
        aggiornato_il: string;
        riepilogo: { notifiche?: unknown } | null;
      } | null;
      return {
        aggiornato: r?.aggiornato_il ?? null,
        notifiche: notificheValide(r?.riepilogo?.notifiche),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

const useNotificheSoci = (soci: boolean) =>
  useQuery({
    queryKey: ["notifiche", "soci"],
    enabled: soci,
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("valori")
        .eq("tipo", "notifiche")
        .eq("mese", "info")
        .maybeSingle();
      if (error) throw error;
      return notificheValide(
        (data?.valori as { notifiche?: unknown } | undefined)?.notifiche,
      );
    },
    staleTime: 5 * 60 * 1000,
  });

const oggiLocale = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** All the notifications to show: run not done, missing decades, partners' ones, then the deadlines passed (newest first). */
export const tutteLeNotifiche = (
  aggiornato: string | null,
  generali: Notifica[],
  soci: Notifica[],
  decadiCaricate: string[],
  ora: Date,
): Notifica[] => {
  const fatto =
    aggiornato && oggiLocale(new Date(aggiornato)) === oggiLocale(ora);
  const giro: Notifica[] =
    !fatto && ora.getHours() >= ORA_GIRO_FATTO
      ? [
          {
            livello: "attenzione",
            chiave: "giro|oggi",
            titolo: "Il giro di stamattina non risulta fatto",
            testo: aggiornato
              ? `Ultimo giro: ${new Date(aggiornato).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}. I numeri sono quelli di allora; il controllo delle 12 lo rilancia.`
              : "Nessun giro registrato.",
            link: null,
          },
        ]
      : [];
  const visibili = generali.filter(
    (n) =>
      !(
        n.chiave.startsWith("decade|") &&
        decadiCaricate.includes(n.chiave.slice(7))
      ),
  );
  // the run writes them oldest first: missing decades on top, then the newest deadline first
  const decadi = visibili.filter((n) => n.chiave.startsWith("decade|"));
  const altre = visibili.filter((n) => !n.chiave.startsWith("decade|"));
  return [...giro, ...decadi.reverse(), ...soci, ...altre.reverse()];
};

/** A read that failed is said as such, not taken for "the run did not go" (review R068). */
const NON_CARICATE: Notifica = {
  livello: "info",
  chiave: "notifiche|errore",
  titolo: "Le notifiche non si sono caricate",
  testo: "Riprova tra poco o ricarica la pagina.",
  link: null,
};

const CampanellaInterna = ({ className }: { className?: string }) => {
  const [aperta, setAperta] = useState(false);
  const { data: socio } = useAccessoUtile();
  const tutti = useNotificheTutti();
  const soci = useNotificheSoci(!!socio);
  const caricati = useCaricamenti(!!socio);
  if (tutti.isPending) return null;
  const decadiCaricate = (caricati.data ?? [])
    .filter((c) => c.tipo === "decade" && !c.scaricato)
    .map((c) => c.sotto);
  const lista = tutti.isError
    ? [NON_CARICATE]
    : tutteLeNotifiche(
        tutti.data.aggiornato,
        tutti.data.notifiche,
        soci.data ?? [],
        decadiCaricate,
        new Date(),
      ).map((x) => (socio ? x : perChiNonESocio(x)));
  const n = lista.length;
  return (
    <Popover open={aperta} onOpenChange={setAperta}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={n ? `Notifiche: ${n}` : "Notifiche: nessuna"}
          className={cn(
            "relative inline-flex size-10 items-center justify-center rounded-full text-pa-blu hover:bg-muted",
            className,
          )}
        >
          <Bell className="size-5" aria-hidden />
          {n > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-pa-rosso px-1 text-center text-xs font-semibold leading-5 text-white">
              {n > 99 ? "99+" : n}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-96 max-w-[calc(100vw-1.5rem)] p-0"
      >
        <div className="bg-pa-blu px-3 py-2 text-sm font-semibold text-white">
          Notifiche
        </div>
        {n === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Non ci sono notifiche.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto text-sm">
            {lista.map((x) => (
              <li
                key={x.chiave}
                className="border-t px-3 py-2 first:border-t-0"
              >
                <div className="font-medium">
                  {x.livello === "info" ? "ℹ" : "⚠"} {mesiInLettere(x.titolo)}
                </div>
                <div className="text-muted-foreground">
                  {mesiInLettere(x.testo)}
                </div>
                {x.link && (
                  <Link
                    to={x.link}
                    onClick={() => setAperta(false)}
                    className="text-sm font-medium text-pa-blu no-underline hover:underline"
                  >
                    Apri ›
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {tutti.data?.aggiornato && (
          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            Aggiornate dal giro del{" "}
            {new Date(tutti.data.aggiornato).toLocaleString("it-IT", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/** The bell sits in the header, outside the page's error boundary: its own boundary hides it on error (review R015). */
export const Campanella = ({ className }: { className?: string }) => (
  <ErrorBoundary fallback={null}>
    <CampanellaInterna className={className} />
  </ErrorBoundary>
);
