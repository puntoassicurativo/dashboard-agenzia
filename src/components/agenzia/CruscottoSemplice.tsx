/**
 * Main page of the agency dashboard (Lorenzo 22/11/2026: "simple things, and on each one you can press and it goes to
 * another page"). One number per tile with its explanation (hover or tap), one comparison line, and the whole tile opens
 * its detail page (CruscottoDettaglio.tsx). The month picked stays in the address and follows into the detail.
 */
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import {
  dataIt,
  type DatiCruscotto,
  polizze,
  useDatiCruscotto,
} from "./Cruscotto";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { meseSolo, ScegliMese } from "./MeseCruscotto";
import { type Colore, euro, euroSegno, Riquadro, Variazione } from "./Riquadro";
import type { Spiegazione } from "./Spiega";
import {
  spiegaAvanzo,
  spiegaDeltaYtd,
  spiegaIncassi,
  spiegaProvv,
  spiegaUtileFiscale,
} from "./spiegaCruscotto";
import { spiegaVitaYtd, type VitaInfo, type VitaMese } from "./spiegaVita";

/** Pill with arrow and word (never colour alone). */
export const Pillola = ({ su, testo }: { su: boolean; testo: string }) => (
  <span
    className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
      su
        ? "bg-pa-verde-chiaro text-pa-verde"
        : "bg-pa-rosso-chiaro text-pa-rosso"
    }`}
  >
    {su ? "▲" : "▼"} {testo}
  </span>
);

interface TesseraProps {
  voce: string;
  ricerca: string;
  titolo: string;
  valore: string;
  spiega: Spiegazione;
  colore?: Colore;
  coloraValore?: boolean;
  children?: ReactNode;
}

/** A simple tile: a click anywhere opens the detail page; the number keeps its own explanation. */
const Tessera = ({
  voce,
  ricerca,
  titolo,
  valore,
  spiega,
  colore = "blu",
  coloraValore,
  children,
}: TesseraProps) => {
  const vai = useNavigate();
  const indirizzo = `/cruscotto/${voce}${ricerca}`;
  return (
    <div
      className="cursor-pointer rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md [&>div]:h-full"
      onClick={() => vai(indirizzo)}
    >
      <Riquadro
        titolo={titolo}
        valore={valore}
        spiega={spiega}
        colore={colore}
        coloraValore={coloraValore}
      >
        {children}
        <Link
          to={indirizzo}
          className="mt-1 inline-flex min-h-10 items-center self-start text-sm font-medium text-pa-blu no-underline hover:underline"
          aria-label={`${titolo}: apri il dettaglio`}
          // the tile navigates too: stop the click here, or Back has to be pressed twice (review R041)
          onClick={(e) => e.stopPropagation()}
        >
          Dettagli ›
        </Link>
      </Riquadro>
    </div>
  );
};

const Tessere = ({ p, ricerca }: { p: DatiCruscotto; ricerca: string }) => {
  const vita = useBlocchi<VitaMese, VitaInfo>("vita");
  const info = vita.data?.info;
  const { m, v } = p;
  const giorno = parseInt(m.fino_al.slice(8, 10), 10);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Tessera
        voce="provvigioni"
        ricerca={ricerca}
        titolo={`Provvigioni di ${meseSolo(m.mese)}${m.parziale ? ` fino al ${giorno}` : ""}`}
        valore={euro(m.provv)}
        spiega={spiegaProvv(m)}
        colore={m.differenza >= 0 ? "verde" : "rosso"}
      >
        <Pillola
          su={m.differenza >= 0}
          testo={`${euroSegno(m.differenza)} sul ${p.annoN - 1}`}
        />
      </Tessera>
      <Tessera
        voce="incassi"
        ricerca={ricerca}
        titolo={`Incassi da inizio ${p.anno}`}
        valore={euro(v.incassi.totale)}
        spiega={spiegaIncassi(v.incassi, p.annoN, p.data.data_dati)}
      >
        <Variazione pct={v.incassi.cresc_totale} testo={`sul ${p.annoN - 1}`} />
      </Tessera>
      <Tessera
        voce="avanzo"
        ricerca={ricerca}
        titolo="Saldo del conto premi"
        valore={euro(v.avanzo.valore)}
        spiega={spiegaAvanzo(v.avanzo, p.saldiMese, p.movimentiAvanzo)}
        colore={v.avanzo.valore < 0 ? "rosso" : "verde"}
        coloraValore
      >
        {v.avanzo.prec_valore != null && (
          <span className="text-muted-foreground">
            il {dataIt(v.avanzo.prec_data)} era {euro(v.avanzo.prec_valore)}
          </span>
        )}
      </Tessera>
      {p.obiettivo && p.fiscaleSpiega && (
        <Tessera
          voce="utile-fiscale"
          ricerca={ricerca}
          titolo="Utile fiscale previsto"
          valore={euro(p.obiettivo.previsto)}
          spiega={spiegaUtileFiscale(p.fiscaleSpiega)}
        >
          <span className="text-muted-foreground">
            obiettivo {euro(p.obiettivo.obiettivo)}
          </span>
        </Tessera>
      )}
      {info &&
        (["vita", "prot"] as const).map((area) => (
          <Tessera
            key={area}
            voce={area === "vita" ? "vita" : "protezione"}
            ricerca={ricerca}
            titolo={`${area === "vita" ? "Vita" : "Protezione"} da inizio ${p.anno}`}
            valore={euro(info.ytd[area])}
            spiega={spiegaVitaYtd(info, area)}
            colore={info.diff[area] >= 0 ? "verde" : "rosso"}
          >
            <Pillola
              su={info.diff[area] >= 0}
              testo={`${euroSegno(info.diff[area])} sul ${p.annoN - 1}`}
            />
          </Tessera>
        ))}
      {(
        [
          ["Delta auto", v.delta_auto, "delta_auto"],
          ["Delta RE", v.delta_re, "delta_re"],
        ] as const
      ).map(([titolo, d, chiave]) => (
        <Tessera
          key={chiave}
          voce="delta"
          ricerca={ricerca}
          titolo={titolo}
          valore={euroSegno(d.ytd.delta)}
          spiega={spiegaDeltaYtd(
            titolo,
            d,
            p.mesiAnno,
            chiave,
            p.data.data_dati,
            p.deltaLetto,
          )}
          colore={d.ytd.delta >= 0 ? "verde" : "rosso"}
        >
          <Pillola
            su={d.ytd.delta_pezzi >= 0}
            testo={polizze(d.ytd.delta_pezzi)}
          />
        </Tessera>
      ))}
    </div>
  );
};

/** Header shared by the main page and the detail pages: name, month picker, data date. */
export const Testata = ({
  p,
  scegli,
  titolo = "Imperia Sanremo",
  sinistra,
}: {
  p: DatiCruscotto;
  scegli: (mese: string) => void;
  titolo?: string;
  sinistra?: ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    {sinistra}
    <div className="flex flex-wrap items-baseline justify-between gap-1">
      <h1 className="text-2xl font-semibold text-pa-blu">{titolo}</h1>
      {p.mesiAnno.length > 1 && (
        <ScegliMese mesi={p.mesiAnno} scelto={p.m.mese} onScegli={scegli} />
      )}
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full bg-pa-verde"
          aria-hidden
        />
        Dati al {dataIt(p.data.data_dati)}, aggiornati il {p.aggiornato}
      </div>
    </div>
  </div>
);

export const Cruscotto = () => {
  const { q, dati, scegli, ricerca } = useDatiCruscotto();
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  if (!dati)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato ancora: l'agente non ha ancora girato.
      </div>
    );
  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full px-4 pt-4 pb-28 md:px-0 md:pt-0 md:pb-8">
      <Testata p={dati} scegli={scegli} />
      {dati.data.avvisi && dati.data.avvisi.length > 0 && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950 p-3 text-sm">
          ⚠ {dati.data.avvisi.join(" · ")}
        </div>
      )}
      <Tessere p={dati} ricerca={ricerca} />
      <p className="text-xs text-muted-foreground">
        Passa sopra (o tocca) un numero per vedere il calcolo; tocca il riquadro
        per aprire il dettaglio.
      </p>
    </div>
  );
};

export default Cruscotto;
