# Attivazione ricerca web reale

La pagina GitHub Pages non contiene chiavi API. Il nuovo `worker.js` è un backend Cloudflare Worker che usa la Responses API di OpenAI con ricerca web e restituisce risultati strutturati all'app.

## 1. Crea il Worker

Nel progetto Cloudflare Workers importa/collega il repository oppure usa Wrangler dalla cartella del progetto.

```bash
npx wrangler login
npx wrangler deploy
```

Il file `wrangler.toml` usa il nome `entrate-extra-search`.

## 2. Inserisci la chiave OpenAI come secret

NON inserirla in `worker.js`, `wrangler.toml` o `index.html`.

```bash
npx wrangler secret put OPENAI_API_KEY
```

Quando richiesto, incolla la tua API key OpenAI.

## 3. Copia l'URL del Worker

Dopo il deploy avrai un indirizzo simile a:

`https://entrate-extra-search.<tuo-subdomain>.workers.dev`

L'endpoint utilizzato dall'app è:

`https://entrate-extra-search.<tuo-subdomain>.workers.dev/search`

## 4. Inseriscilo nella Dashboard dell'app

Apri l'app GitHub Pages, vai nella Dashboard e nel campo **Backend ricerca** inserisci l'URL completo che termina con `/search`.

L'URL viene salvato solo nel browser. La chiave OpenAI resta nel Worker.

## 5. Cosa succede quando premi Cerca

1. Il browser invia query e profilo al Worker.
2. Il Worker chiama OpenAI con lo strumento di ricerca web.
3. Il modello cerca annunci e richieste reali.
4. Vengono filtrati duplicati e risultati senza URL verificabile.
5. L'app mostra titolo, fonte, località, compenso, tipo di rapporto, indicazione partita IVA, motivazione e link all'annuncio.

## Nota

La ricerca automatica dipende dalla disponibilità e qualità delle fonti trovate sul web. L'app non deve considerare un annuncio come automaticamente regolare dal punto di vista fiscale: i casi dubbi vengono marcati **da verificare**.
