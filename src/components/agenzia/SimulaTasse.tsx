/**
 * "Simulate with your own profit" box of the tax section: the user types an estimated taxable
 * profit, the partners' split and the withholdings already retained, and sees the tax split
 * (IRAP, INPS, IRPEF, local surtaxes per partner), what is still to pay and how much to set aside
 * per month. Computed in the browser with the agent's formula (tasse.ts), nothing is saved.
 */
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { parseAmount, splitTaxes, type PartnerTaxes } from "./tasse";

const DEFAULT_SHARE = 50;
const PARTNERS = ["Fabio", "Claudio"] as const;

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

const PARTNER_ROWS: [keyof PartnerTaxes, string, boolean?][] = [
  ["share", "Quota di utile"],
  ["inps", "Contributi INPS commercianti (24,48%)"],
  ["irpef", "IRPEF (23% fino a 28.000, 33% fino a 50.000, 43% oltre)"],
  ["surtax", "Addizionali regionale e comunale (2,5%)"],
  ["total", "Tasse e contributi del socio", true],
];

interface Field {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}

const Campo = ({ id, label, value, onChange }: Field) => (
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

export interface SimulaTasseProps {
  defaultProfit?: number | null;
  defaultWithheld?: number | null;
}

export const SimulaTasse = ({
  defaultProfit,
  defaultWithheld,
}: SimulaTasseProps) => {
  const [profitText, setProfitText] = useState(asText(defaultProfit));
  const [shareText, setShareText] = useState(String(DEFAULT_SHARE));
  const [withheldText, setWithheldText] = useState(
    asText(defaultWithheld ?? 0),
  );

  const profit = parseAmount(profitText);
  const share = parseAmount(shareText);
  const withheld = withheldText.trim() === "" ? 0 : parseAmount(withheldText);
  const errors = [
    profit == null && "Scrivi l'utile in euro, per esempio 170.000.",
    (share == null || share > 100) && "La quota di Fabio va da 0 a 100.",
    withheld == null && "Scrivi le ritenute in euro, oppure 0.",
  ].filter(Boolean) as string[];
  const split =
    errors.length === 0 ? splitTaxes(profit!, share!, withheld!) : null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">
        Simula le tasse con il tuo utile
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        Scrivi l'utile fiscale che ti aspetti: sotto c'è come si dividono le
        tasse. Parte dalla proiezione della dashboard. Non si salva niente.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo
          id="sim-utile"
          label="Utile fiscale dell'anno (euro)"
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
      {errors.length > 0 && (
        <ul className="mt-3 text-sm text-destructive">
          {errors.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {split && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th />
                {PARTNERS.map((p, i) => (
                  <th key={p} className="py-1 pl-2 text-right font-medium">
                    {p} ({i === 0 ? share : 100 - share!}%)
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
                  {split.partners.map((p, i) => (
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
          <table className="mt-3 w-full text-sm tabular-nums">
            <tbody>
              {(
                [
                  ["IRAP della SNC (3,9% dell'utile)", split.irap],
                  [
                    "Totale tasse e contributi (IRAP più i due soci)",
                    split.total,
                    true,
                  ],
                  [
                    "Meno ritenute già trattenute dalla compagnia",
                    -split.withheld,
                  ],
                  ["Resta da versare", split.stillToPay, true],
                  [
                    "Da mettere da parte ogni mese (resta da versare diviso 12)",
                    split.perMonth,
                    true,
                  ],
                ] as [string, number, boolean?][]
              ).map(([nome, v, forte]) => (
                <tr
                  key={nome}
                  className={`border-t ${forte ? "font-semibold" : ""}`}
                >
                  <td className="py-1.5 pr-2">{nome}</td>
                  <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                    {euro(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-muted-foreground">
            Ipotesi: nessun altro reddito dei soci (se ne hanno, l'IRPEF sale),
            aliquote INPS e addizionali approssimate. La cifra vera resta quella
            della dichiarazione di Mauro.
          </p>
        </div>
      )}
    </div>
  );
};
