/**
 * Contabilita' > Simula tasse (Fabio, 18/11/2026, messages and call): three simulations side by side.
 * 1) taxes on the taxable profit made so far, 2) taxes at year end if the year goes on like this (projection),
 * 3) a free simulation: the starting profit plus pieces Fabio adds (a cost that lowers the profit, or an invoice to a
 * flat-rate person such as Silvia, whose own taxes are counted too), so he sees what to do to stay in his range.
 * Totals are SNC (IRAP) + partners (INPS, IRPEF, surtaxes) + the flat-rate people the SNC pays. Computed in the
 * browser with the agent's formula (tasse.ts); nothing is saved.
 */
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  FLAT_COEFFICIENT,
  FLAT_INPS_RATE,
  FLAT_TAX_RATE,
  parseAmount,
  type PartnerTaxes,
  simulate,
  splitTaxes,
  type TaxSplit,
} from "./tasse";

const PARTNERS = ["Fabio", "Claudio"] as const;
const DEFAULT_SHARE = 50;
const FLAT_RATE_NAMES = /tombolato|silvia|lorenzo/i;

const euro = (v: number) =>
  v.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions);
const asText = (v: number | null | undefined) =>
  v == null
    ? ""
    : Math.round(v).toLocaleString("it-IT", {
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);

export interface ColonnaFissa {
  utile: number;
  ritenute: number;
}
export interface VocePrevista {
  voce: string;
  resta: number;
}
export interface SimulaTasseProps {
  /** label of the first column, e.g. "Da gennaio a ottobre" */
  finoAOggi: string;
  daGennaio: ColonnaFissa;
  proiezione: ColonnaFissa | null;
  previsti?: VocePrevista[];
}

interface PezzoTesto {
  id: number;
  label: string;
  amount: string;
  flatRate: boolean;
}

const Campo = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

type Riga = [string, (c: Colonna) => number | null, boolean?];
interface Colonna {
  utile: number;
  split: TaxSplit;
  diChiFattura: number | null;
  totale: number;
}
const RIGHE: Riga[] = [
  ["Utile fiscale", (c) => c.utile, true],
  ["IRAP della SNC (3,9%)", (c) => c.split.irap],
  ["Tasse e contributi di Fabio", (c) => c.split.partners[0].total],
  ["Tasse e contributi di Claudio", (c) => c.split.partners[1].total],
  ["Tasse di chi fattura alla SNC (forfettario)", (c) => c.diChiFattura],
  ["Imposte totali, tutti insieme", (c) => c.totale, true],
  ["Meno ritenute già trattenute", (c) => -c.split.withheld],
  ["Resta da versare per la SNC e i soci", (c) => c.split.stillToPay, true],
  ["Da mettere da parte ogni mese", (c) => c.split.perMonth],
];
const PARTNER_ROWS: [keyof PartnerTaxes, string, boolean?][] = [
  ["share", "Quota di utile"],
  ["inps", "Contributi INPS commercianti (24,48%)"],
  ["irpef", "IRPEF (23% fino a 28.000, 33% fino a 50.000, 43% oltre)"],
  ["surtax", "Addizionali regionale e comunale (2,5%)"],
  ["total", "Tasse e contributi del socio", true],
];

let nextId = 1;
const pezzo = (label: string, amount: number | null, flatRate: boolean) => ({
  id: nextId++,
  label,
  amount: asText(amount),
  flatRate,
});

export const SimulaTasse = ({
  finoAOggi,
  daGennaio,
  proiezione,
  previsti = [],
}: SimulaTasseProps) => {
  const partenza = proiezione ?? daGennaio;
  const [shareText, setShareText] = useState(String(DEFAULT_SHARE));
  const [profitText, setProfitText] = useState(asText(partenza.utile));
  const [withheldText, setWithheldText] = useState(asText(partenza.ritenute));
  const [coeffText, setCoeffText] = useState(String(FLAT_COEFFICIENT));
  const [taxText, setTaxText] = useState(String(FLAT_TAX_RATE));
  const [inpsText, setInpsText] = useState(String(FLAT_INPS_RATE));
  const [pezzi, setPezzi] = useState<PezzoTesto[]>(() =>
    previsti.map((v) => pezzo(v.voce, v.resta, FLAT_RATE_NAMES.test(v.voce))),
  );

  const share = parseAmount(shareText);
  const profit = parseAmount(profitText);
  const withheld = withheldText.trim() === "" ? 0 : parseAmount(withheldText);
  const flat = {
    coefficient: parseAmount(coeffText),
    tax: parseAmount(taxText),
    inps: parseAmount(inpsText),
  };
  const importi = pezzi.map((p) =>
    p.amount.trim() === "" ? 0 : parseAmount(p.amount),
  );
  const errori = [
    profit == null &&
      "Scrivi l'utile di partenza in euro, per esempio 170.000.",
    (share == null || share > 100) && "La quota di Fabio va da 0 a 100.",
    withheld == null && "Scrivi le ritenute in euro, oppure 0.",
    (flat.coefficient == null || flat.tax == null || flat.inps == null) &&
      "Coefficiente, imposta e INPS del forfettario vanno scritti in percentuale.",
    importi.some((x) => x == null) &&
      "Gli importi delle voci vanno scritti in euro.",
  ].filter(Boolean) as string[];

  const quota = share != null && share <= 100 ? share : DEFAULT_SHARE;
  const fissa = (c: ColonnaFissa): Colonna => {
    const split = splitTaxes(c.utile, quota, c.ritenute);
    return { utile: c.utile, split, diChiFattura: null, totale: split.total };
  };
  const libera =
    errori.length === 0
      ? simulate(
          profit!,
          pezzi.map((p, i) => ({
            label: p.label,
            amount: importi[i]!,
            flatRate: p.flatRate,
          })),
          quota,
          withheld!,
          {
            coefficient: flat.coefficient!,
            tax: flat.tax!,
            inps: flat.inps!,
          },
        )
      : null;
  const colonne: [string, Colonna | null][] = [
    [finoAOggi, fissa(daGennaio)],
    ["Fine anno, se si continua così", proiezione ? fissa(proiezione) : null],
    [
      "I tuoi numeri",
      libera && {
        utile: libera.profit,
        split: libera.snc,
        diChiFattura: libera.recipientsTotal,
        totale: libera.grandTotal,
      },
    ],
  ];

  const cambia = (id: number, campo: Partial<PezzoTesto>) =>
    setPezzi(pezzi.map((p) => (p.id === id ? { ...p, ...campo } : p)));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th />
              {colonne.map(([t]) => (
                <th key={t} className="py-1 pl-2 text-right font-medium">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RIGHE.map(([nome, valore, forte]) => (
              <tr
                key={nome}
                className={`border-t ${forte ? "font-semibold" : ""}`}
              >
                <td className="py-1.5 pr-2">{nome}</td>
                {colonne.map(([t, c]) => {
                  const v = c ? valore(c) : null;
                  return (
                    <td
                      key={t}
                      className="py-1.5 pl-2 text-right whitespace-nowrap"
                    >
                      {v == null ? "" : euro(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {libera && libera.piecesTotal > 0 && (
          <p className="mt-2 text-sm">
            Con le voci qui sotto ({euro(libera.piecesTotal)}) le imposte di
            tutti insieme{" "}
            {libera.saving >= 0
              ? `scendono di ${euro(libera.saving)}`
              : `salgono di ${euro(-libera.saving)}`}{" "}
            rispetto all'utile di partenza.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
        <h2 className="text-base font-semibold">I tuoi numeri</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            id="sim-utile"
            label="Utile fiscale di partenza (euro)"
            value={profitText}
            onChange={setProfitText}
          />
          <Campo
            id="sim-quota"
            label="Quota di Fabio (%), Claudio il resto"
            value={shareText}
            onChange={setShareText}
          />
          <Campo
            id="sim-ritenute"
            label="Ritenute già trattenute (euro)"
            value={withheldText}
            onChange={setWithheldText}
          />
        </div>
        <h3 className="font-medium">Voci da togliere dall'utile</h3>
        <ul className="flex flex-col gap-2">
          {pezzi.map((p) => (
            <li
              key={p.id}
              className="grid gap-2 sm:grid-cols-[2fr_1fr_auto_auto] items-end"
            >
              <Campo
                id={`voce-${p.id}`}
                label="Voce"
                value={p.label}
                onChange={(v) => cambia(p.id, { label: v })}
              />
              <Campo
                id={`importo-${p.id}`}
                label="Importo (euro)"
                value={p.amount}
                onChange={(v) => cambia(p.id, { amount: v })}
              />
              <label className="flex items-center gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={p.flatRate}
                  onChange={(e) => cambia(p.id, { flatRate: e.target.checked })}
                />
                Fattura di una persona in forfettario
              </label>
              <button
                className="rounded-md border px-2 py-1 text-sm hover:bg-muted mb-1"
                onClick={() => setPezzi(pezzi.filter((x) => x.id !== p.id))}
              >
                Togli
              </button>
            </li>
          ))}
        </ul>
        <button
          className="self-start rounded-md border px-3 py-1 text-sm font-medium hover:bg-muted"
          onClick={() => setPezzi([...pezzi, pezzo("", null, false)])}
        >
          Aggiungi una voce
        </button>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            id="sim-coeff"
            label="Forfettario, coefficiente (%)"
            value={coeffText}
            onChange={setCoeffText}
          />
          <Campo
            id="sim-imposta"
            label="Forfettario, imposta sostitutiva (%)"
            value={taxText}
            onChange={setTaxText}
          />
          <Campo
            id="sim-inps"
            label="Forfettario, INPS (%)"
            value={inpsText}
            onChange={setInpsText}
          />
        </div>
        {errori.length > 0 && (
          <ul className="text-sm text-destructive">
            {errori.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        {libera && libera.recipients.length > 0 && (
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="font-normal">Chi fattura</th>
                <th className="font-normal text-right">Base imponibile</th>
                <th className="font-normal text-right">Imposta</th>
                <th className="font-normal text-right">INPS</th>
                <th className="font-normal text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {libera.recipients.map((r, i) => (
                <tr key={`${r.label}-${i}`} className="border-t">
                  <td className="py-1.5">{r.label || "Senza nome"}</td>
                  <td className="py-1.5 text-right">{euro(r.taxes.base)}</td>
                  <td className="py-1.5 text-right">{euro(r.taxes.tax)}</td>
                  <td className="py-1.5 text-right">{euro(r.taxes.inps)}</td>
                  <td className="py-1.5 text-right font-semibold">
                    {euro(r.taxes.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {libera && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Dettaglio dei due soci con i tuoi numeri
            </summary>
            <table className="mt-2 w-full tabular-nums">
              <thead>
                <tr className="text-muted-foreground">
                  <th />
                  {PARTNERS.map((p, i) => (
                    <th key={p} className="py-1 pl-2 text-right font-medium">
                      {p} ({i === 0 ? quota : 100 - quota}%)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARTNER_ROWS.map(([k, nome, forte]) => (
                  <tr
                    key={k}
                    className={`border-t ${forte ? "font-semibold" : ""}`}
                  >
                    <td className="py-1.5 pr-2">{nome}</td>
                    {libera.snc.partners.map((p, i) => (
                      <td
                        key={PARTNERS[i]}
                        className="py-1.5 pl-2 text-right whitespace-nowrap"
                      >
                        {euro(p[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Ipotesi: nessun altro reddito dei soci (se ne hanno, l'IRPEF sale),
        aliquote INPS e addizionali approssimate. Forfettario come detto da
        Fabio (imposta e INPS sul 78% della fattura), da verificare con lo
        studio: la domanda è in Per lo studio. Non si salva niente. La cifra
        vera resta quella della dichiarazione.
      </p>
    </div>
  );
};
