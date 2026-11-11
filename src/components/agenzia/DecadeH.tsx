/**
 * Summary of section H (decade check): for each decade read by the agent (decade.py), the figures recomputed from the
 * downloaded files against the "DATI DECADE" summary, the title counts against BO and the expected rate, the
 * commission cash movements without a policy title and the head-office movements. Rows (titles out of rate) are the
 * usual section cards.
 */

type Voce = {
  riepilogo: number | null;
  calcolato: number | null;
  ok: boolean;
  solo_riscontro?: boolean;
};

export type DecadeInfo = {
  data: string;
  valuta_bonifico?: string | null;
  quadratura: Record<string, Voce>;
  quadra: boolean;
  conteggi: Record<string, number>;
  provvigioni_senza_titolo: Record<string, number>;
  totale_senza_titolo: number;
  direzione: { voce: string; righe: number; importo: number }[];
  note: string[];
};

export type RiepilogoH = {
  decadi?: DecadeInfo[];
  nota?: string;
  ultimo_giorno_bo?: string | null;
  soglia?: { euro: number; percento: number };
};

const euro = (v: number | null | undefined) =>
  v == null
    ? "n.d."
    : v.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);
const it = (iso?: string | null) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";

const VOCI: [string, string][] = [
  ["premi", "Premi"],
  ["provvigioni", "Provvigioni"],
  ["saldo_pa", "Saldo da bonificare alla compagnia"],
  ["broker_corr", "Slittamento broker alla decade dopo"],
  ["direzione", "Movimenti di direzione (solo riscontro)"],
];

const Conteggio = ({ k, v }: { k: string; v: string | number }) => (
  <div className="rounded-md border px-3 py-1.5 text-sm">
    <span className="text-muted-foreground">{k}</span>{" "}
    <span className="font-semibold tabular-nums">{v}</span>
  </div>
);

const Decade = ({
  d,
  ultimoBo,
}: {
  d: DecadeInfo;
  ultimoBo?: string | null;
}) => {
  const c = d.conteggi;
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Decade del {it(d.data)}</h2>
        <span
          className={`text-sm font-medium ${d.quadra ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
        >
          {d.quadra
            ? "Torna al centesimo col riepilogo"
            : "Non torna col riepilogo"}
        </span>
      </div>
      {d.valuta_bonifico && (
        <p className="text-sm text-muted-foreground">
          Bonifico alla compagnia con valuta {it(d.valuta_bonifico)}.
        </p>
      )}
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-muted-foreground text-left">
            <th className="font-normal py-1">Voce</th>
            <th className="font-normal text-right">Riepilogo</th>
            <th className="font-normal text-right">Dai file</th>
          </tr>
        </thead>
        <tbody>
          {VOCI.filter(([k]) => d.quadratura[k]).map(([k, t]) => {
            const v = d.quadratura[k];
            return (
              <tr key={k} className="border-t">
                <td className="py-1 pr-2">{t}</td>
                <td className="text-right whitespace-nowrap">
                  {euro(v.riepilogo)}
                </td>
                <td
                  className={`text-right whitespace-nowrap ${v.ok ? "" : "text-red-700 dark:text-red-400"}`}
                >
                  {euro(v.calcolato)}
                  {v.ok ? " ✓" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <Conteggio k="Titoli" v={c.titoli ?? 0} />
        <Conteggio k="Uguali a BO" v={c.uguali_bo ?? 0} />
        {!!c.diversi_bo && <Conteggio k="Diversi da BO" v={c.diversi_bo} />}
        {!!c.non_ancora_in_bo && (
          <Conteggio
            k={`Non ancora in BO (dati BO al ${it(ultimoBo)})`}
            v={c.non_ancora_in_bo}
          />
        )}
        {!!c.non_in_bo && <Conteggio k="Non trovati in BO" v={c.non_in_bo} />}
        <Conteggio k="Controllati con l'aliquota" v={c.controllati ?? 0} />
        <Conteggio
          k="Fuori aliquota"
          v={`${c.fuori_aliquota ?? 0}${c.fuori_aliquota ? `, ${euro(c.scarto_fuori_aliquota)}` : ""}`}
        />
      </div>
      {d.totale_senza_titolo !== 0 && (
        <div className="text-sm">
          <div className="font-medium">
            Provvigioni pagate senza un titolo: {euro(d.totale_senza_titolo)}
          </div>
          <p className="text-muted-foreground">
            Movimenti di cassa che la compagnia registra a parte (non sono
            errori): sono dentro le provvigioni della decade ma non nei titoli
            di BO.
          </p>
          <ul className="mt-1">
            {Object.entries(d.provvigioni_senza_titolo).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-3 tabular-nums">
                <span className="min-w-0">{k}</span>
                <span className="whitespace-nowrap">{euro(v)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.direzione.length > 0 && (
        <div className="text-sm">
          <div className="font-medium">Movimenti di direzione</div>
          <ul className="mt-1">
            {d.direzione.map((x) => (
              <li
                key={x.voce}
                className={`flex justify-between gap-3 tabular-nums ${x.importo > 0 ? "text-red-700 dark:text-red-400" : ""}`}
              >
                <span className="min-w-0">
                  {x.voce} ({x.righe})
                </span>
                <span className="whitespace-nowrap">
                  {x.importo > 0
                    ? `addebito ${euro(x.importo)}`
                    : `a favore ${euro(-x.importo)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.note.map((n) => (
        <p key={n} className="text-xs text-muted-foreground">
          {n}
        </p>
      ))}
    </div>
  );
};

export const DecadeH = ({ r }: { r: RiepilogoH }) => {
  if (!r.decadi?.length)
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        Nessuna decade letta. I file vanno in Assicurativo\input\decade\ in una
        cartella con la data di chiusura (AAAA-MM-GG).
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {r.decadi.map((d) => (
        <Decade key={d.data} d={d} ultimoBo={r.ultimo_giorno_bo} />
      ))}
      <p className="text-sm text-muted-foreground">
        Sotto, i soli titoli da guardare: provvigione della decade diversa da
        BO, oppure lontana dall'aliquota attesa di oltre {r.soglia?.euro ?? 1}{" "}
        euro e del {r.soglia?.percento ?? 2}%. {r.nota}
      </p>
    </div>
  );
};
