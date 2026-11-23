/**
 * Vita and Protezione tiles of the main page (plan of 21/11/2026, P2a; shown from 22/11/2026). Partners only: the
 * andamento_blocchi rows are protected by RLS, for everyone else the query is empty and nothing is shown.
 */
import { useBlocchi } from "./datiLati";
import { meseSolo } from "./MeseCruscotto";
import { euro, euroSegno, Riquadro } from "./Riquadro";
import { Spiegato } from "./Spiega";
import {
  type Area,
  spiegaNuovaProduzione,
  spiegaVitaAnnoPrima,
  spiegaVitaMese,
  spiegaVitaMeseAnnoPrima,
  spiegaVitaYtd,
  type VitaInfo,
  type VitaMese,
} from "./spiegaVita";

const Pillola = ({ valore, testo }: { valore: number; testo: string }) => {
  const su = valore >= 0;
  return (
    <span
      className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
        su
          ? "bg-pa-verde-chiaro text-pa-verde"
          : "bg-pa-rosso-chiaro text-pa-rosso"
      }`}
    >
      {su ? "▲" : "▼"} {euroSegno(valore)} {testo}
    </span>
  );
};

export const RiquadroArea = ({
  area,
  info,
  mese,
  datiMese,
}: {
  area: Area;
  info: VitaInfo;
  mese: string;
  datiMese?: VitaMese;
}) => {
  const anno = info.dati_al.slice(0, 4);
  const annoPrima = info.dati_al_ap.slice(0, 4);
  const np = area === "vita" ? spiegaNuovaProduzione(info) : undefined;
  return (
    <Riquadro
      titolo={`${area === "vita" ? "Vita" : "Protezione"} da inizio ${anno}`}
      valore={euro(info.ytd[area])}
      colore={info.diff[area] >= 0 ? "verde" : "rosso"}
      spiega={spiegaVitaYtd(info, area)}
    >
      <Pillola valore={info.diff[area]} testo={`sul ${annoPrima}`} />
      <span className="text-muted-foreground">
        {annoPrima}:{" "}
        <Spiegato spiega={spiegaVitaAnnoPrima(info, area)}>
          {euro(info.ytd_ap[area])}
        </Spiegato>
      </span>
      {datiMese && (
        <span className="text-muted-foreground">
          {meseSolo(mese)}:{" "}
          <Spiegato spiega={spiegaVitaMese(mese, datiMese, area)}>
            {euro(datiMese.ac[area])}
          </Spiegato>{" "}
          ({annoPrima}:{" "}
          <Spiegato spiega={spiegaVitaMeseAnnoPrima(mese, datiMese, area)}>
            {euro(datiMese.ap[area])}
          </Spiegato>
          )
        </span>
      )}
      {np && info.np_ytd && (
        <span className="text-muted-foreground hidden sm:block">
          nuova produzione a {meseSolo(info.np_fino_a ?? "")}:{" "}
          <Spiegato spiega={np}>{euro(info.np_ytd.ac.totale)}</Spiegato>
        </span>
      )}
    </Riquadro>
  );
};

/** The two tiles, following the month picked on the main page. Nothing while loading or for non-partners. */
export const RiquadriVita = ({ mese }: { mese: string }) => {
  const q = useBlocchi<VitaMese, VitaInfo>("vita");
  const info = q.data?.info;
  if (!info) return null;
  const datiMese = q.data?.mesi[mese];
  return (
    <>
      <RiquadroArea area="vita" info={info} mese={mese} datiMese={datiMese} />
      <RiquadroArea area="prot" info={info} mese={mese} datiMese={datiMese} />
    </>
  );
};
