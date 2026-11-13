/**
 * Loading error with a "reload" button. Fabio saw "Errore nel caricare" on his phone while the same account worked on a
 * clean browser (13/11/2026): most likely an old PWA version kept by the service worker. The button drops the service
 * worker and its caches, then reloads, so the phone takes the current version.
 */
const ricaricaDashboard = async () => {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const nomi = await caches.keys();
      await Promise.all(nomi.map((n) => caches.delete(n)));
    }
  } finally {
    window.location.reload();
  }
};

export const ErroreCaricamento = ({
  cosa = "i dati",
  errore,
}: {
  cosa?: string;
  errore: unknown;
}) => (
  <div className="p-4 text-sm text-red-700 space-y-2">
    <div>
      Errore nel caricare {cosa}:{" "}
      {String((errore as { message?: string })?.message ?? errore)}
    </div>
    <button
      type="button"
      onClick={ricaricaDashboard}
      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-red-800 hover:bg-red-50"
    >
      Ricarica la dashboard
    </button>
    <div className="text-xs text-muted-foreground">
      Se l'errore resta anche dopo aver ricaricato, fai uno screenshot di questa
      scritta e mandalo a Lorenzo.
    </div>
  </div>
);
