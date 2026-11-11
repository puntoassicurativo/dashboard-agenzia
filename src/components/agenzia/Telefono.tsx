/**
 * "Put the dashboard on your phone" instructions: the dashboard is a PWA, so it installs from the browser without
 * any app store.
 */
export const Telefono = () => (
  <details className="rounded-lg border bg-card p-4 text-sm">
    <summary className="cursor-pointer select-none text-base font-semibold">
      Metti la dashboard sul telefono
    </summary>
    <p className="mt-2 text-muted-foreground">
      Non serve nessun negozio di app: si aggiunge dal browser e poi si apre con
      un'icona, come un'app.
    </p>
    <div className="mt-2 font-medium">iPhone</div>
    <ol className="list-decimal pl-5 space-y-0.5">
      <li>Apri questa pagina con Safari.</li>
      <li>Tocca il pulsante Condividi (il quadrato con la freccia in su).</li>
      <li>Scegli "Aggiungi alla schermata Home", poi "Aggiungi".</li>
    </ol>
    <div className="mt-2 font-medium">Android</div>
    <ol className="list-decimal pl-5 space-y-0.5">
      <li>Apri questa pagina con Chrome.</li>
      <li>Tocca i tre puntini in alto a destra.</li>
      <li>Scegli "Installa app" (o "Aggiungi a schermata Home").</li>
    </ol>
    <p className="mt-2 text-muted-foreground">
      Dopo ogni aggiornamento della dashboard l'app prende da sola la versione
      nuova la prima volta che la apri.
    </p>
  </details>
);
