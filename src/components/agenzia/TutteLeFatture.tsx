/**
 * Contabilita' > Tutte le fatture (Fabio 17/11/2026: opening the accounts he wants to see every invoice at once).
 * One list, newest first, no filters in front: invoices of sub-agents and collaborators (sub_fatture), brokers
 * (broker_saldi), AGN electricity bills (bollette), and the XML of the tax drawer (fatture) when they arrive.
 * Partners only (andamento_blocchi is protected by RLS on utile_accesso). Also the instalments of the tombale (B14).
 */
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro } from "./formato";
import { Pagina } from "./Lato";

interface FatturaSub {
  fattura: {
    chi: string;
    numero: string | null;
    data: string | null;
    periodo: string | null;
    imponibile: number | null;
    ritenuta: number | null;
    netto: number | null;
  } | null;
  bonifico: { data: string; importo: number } | null;
  bonifico_diverso: { data: string; importo: number } | null;
}
interface BrokerRiga {
  broker: string;
  mese: string;
  provvigioni: number;
  ritenuta: number;
  netto: number;
  tipo: string;
  arrivato: string;
  mese_saldi: string;
  uscita_saldi: number | null;
}
interface FatturaCassetto {
  data: string;
  fornitore: string;
  numero: string;
  totale: number;
  ritenuta: number | null;
  pagamento?: { data: string } | null;
}
interface Bolletta {
  data: string;
  fornitore: string;
  importo: number | null;
  pagata_il: string | null;
  stato: string;
}
interface Tombale {
  rate: { data: string; importo: number; stato: string }[];
  rate_totali: number;
  pagate: number;
  restano_nel_prospetto: number;
  rate_senza_importo: number;
  ultima: string;
  totale_prospetto: number;
  arrivato: string;
}

export interface RigaFattura {
  data: string;
  fornitore: string;
  dettaglio: string;
  importo: number | null;
  pagata: string;
  ritenuta: number | null;
}

/** Supplier as the agent writes its code (sub-agents by place); names of people never in the repository. */
const nome = (codice: string) =>
  codice.charAt(0) + codice.slice(1).toLowerCase();
const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
const mese = (aaaa_mm: string) =>
  `${MESI[parseInt(aaaa_mm.slice(5, 7), 10) - 1]} ${aaaa_mm.slice(0, 4)}`;

/** All the invoices the dashboard knows, one shape, newest first. Exported for the test. */
export const unisci = (
  sub: Record<string, FatturaSub>,
  broker: Record<string, { righe: BrokerRiga[] }>,
  cassetto: Record<string, { fatture?: FatturaCassetto[] }>,
  bollette: Bolletta[],
): RigaFattura[] => {
  const out: RigaFattura[] = [];
  for (const [chiave, v] of Object.entries(sub)) {
    const f = v.fattura;
    if (!f || f.netto == null) continue;
    const chi = chiave.split("|")[1] ?? f.chi;
    out.push({
      data: f.data ?? `${chiave.slice(0, 7)}-28`,
      fornitore: nome(chi),
      dettaglio: `provvigioni di ${mese(chiave.slice(0, 7))}${f.numero ? `, n. ${f.numero}` : ""}`,
      importo: f.imponibile,
      pagata: v.bonifico
        ? dataIt(v.bonifico.data)
        : v.bonifico_diverso
          ? `${dataIt(v.bonifico_diverso.data)} (importo diverso)`
          : "non ancora",
      ritenuta: f.ritenuta,
    });
  }
  for (const m of Object.values(broker)) {
    for (const r of m.righe ?? []) {
      out.push({
        data: r.arrivato,
        fornitore: r.broker,
        dettaglio: `${r.tipo === "fattura" ? "fattura" : "estratto conto"} di ${mese(r.mese)}`,
        importo: r.provvigioni,
        pagata:
          r.uscita_saldi != null
            ? `nel foglio Saldi di ${mese(r.mese_saldi)}`
            : "non ancora",
        ritenuta: r.ritenuta,
      });
    }
  }
  for (const m of Object.values(cassetto)) {
    for (const f of m.fatture ?? []) {
      out.push({
        data: f.data,
        fornitore: f.fornitore,
        dettaglio: `fattura n. ${f.numero} (cassetto fiscale)`,
        importo: f.totale,
        pagata: f.pagamento?.data ? dataIt(f.pagamento.data) : "non ancora",
        ritenuta: f.ritenuta,
      });
    }
  }
  for (const b of bollette) {
    out.push({
      data: b.data,
      fornitore: b.fornitore,
      dettaglio: "bolletta (importo dall'addebito sul conto 257)",
      importo: b.importo,
      pagata: b.pagata_il ? dataIt(b.pagata_il) : b.stato,
      ritenuta: null,
    });
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
};

export const ElencoFatture = ({ righe }: { righe: RigaFattura[] }) => (
  <div className="rounded-2xl border bg-card p-4 text-sm overflow-x-auto">
    <table className="w-full tabular-nums">
      <thead className="text-muted-foreground text-left">
        <tr>
          <th className="font-normal py-1">Data</th>
          <th className="font-normal">Fornitore</th>
          <th className="font-normal text-right">Importo</th>
          <th className="font-normal text-right hidden sm:table-cell">
            Ritenuta
          </th>
          <th className="font-normal text-right">Pagata il</th>
        </tr>
      </thead>
      <tbody>
        {righe.map((r, i) => (
          <tr
            key={`${r.data}-${r.fornitore}-${i}`}
            className="border-t align-top"
          >
            <td className="py-1.5 pr-2 whitespace-nowrap">{dataIt(r.data)}</td>
            <td className="pr-2">
              {r.fornitore}
              <span className="block text-xs text-muted-foreground">
                {r.dettaglio}
              </span>
            </td>
            <td className="text-right whitespace-nowrap">
              {r.importo != null ? euro(r.importo) : "n.d."}
            </td>
            <td className="text-right hidden sm:table-cell">
              {r.ritenuta ? euro(r.ritenuta) : ""}
            </td>
            <td
              className={`text-right ${r.pagata === "non ancora" || r.pagata.includes("diverso") ? "text-pa-rosso" : ""}`}
            >
              {r.pagata}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RiquadroTombale = ({ t }: { t: Tombale }) => (
  <div className="rounded-2xl border border-l-4 border-l-pa-blu bg-card p-4 text-sm">
    <div className="font-semibold">Rateizzazione tombale 2018-2022</div>
    <div className="text-muted-foreground tabular-nums mt-1">
      Pagate {t.pagate} rate di {t.rate_totali}. Restano{" "}
      {euro(t.restano_nel_prospetto)} nel prospetto dello studio
      {t.rate_senza_importo > 0 &&
        ` più ${t.rate_senza_importo} rate da comunicare, l'ultima a ${mese(t.ultima)}`}
      . Prospetto arrivato il {dataIt(t.arrivato)}; costo non deducibile, già
      nei conti.
    </div>
  </div>
);

/** sub_fatture rows have keys "AAAA-MM|CHI" (useBlocchi keeps only "AAAA-MM"): read them as they are. */
const useFattureSub = () =>
  useQuery({
    queryKey: ["andamento", "sub_fatture", "tutte"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "sub_fatture");
      if (error) throw error;
      const righe = (data ?? []) as { mese: string; valori: FatturaSub }[];
      return Object.fromEntries(
        righe
          .filter((r) => r.mese.includes("|"))
          .map((r) => [r.mese, r.valori]),
      );
    },
  });

export const TutteLeFatture = () => {
  const sub = useFattureSub();
  const broker = useBlocchi<{ righe: BrokerRiga[] }, unknown>("broker_saldi");
  const cassetto = useBlocchi<{ fatture?: FatturaCassetto[] }, unknown>(
    "fatture",
  );
  const bollette = useBlocchi<unknown, { bollette: Bolletta[] }>("bollette");
  const tombale = useBlocchi<unknown, Tombale | null>("tombale");
  const qs = [sub, broker, cassetto, bollette, tombale];
  if (qs.some((q) => q.isPending))
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  const errore = qs.find((q) => q.error)?.error;
  if (errore) return <ErroreCaricamento errore={errore} />;
  const righe = unisci(
    sub.data ?? {},
    broker.data?.mesi ?? {},
    cassetto.data?.mesi ?? {},
    bollette.data?.info?.bollette ?? [],
  );
  return (
    <Pagina
      titolo="Tutte le fatture"
      sotto="Subagenti, collaboratori, broker, bollette della luce e, quando arrivano, le fatture del cassetto fiscale. Dalla più recente."
    >
      {tombale.data?.info && <RiquadroTombale t={tombale.data.info} />}
      {righe.length === 0 ? (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessuna fattura ancora.
        </div>
      ) : (
        <ElencoFatture righe={righe} />
      )}
    </Pagina>
  );
};
