const ALLOWED_ORIGIN = "https://arst-calcolo-tratte.github.io";
const MODEL = "gpt-5.6-luna";

const SYSTEM = `Sei il motore di ricerca dell'app "Assistente Entrate Extra".
Devi cercare sul web opportunità REALI e RECENTI per una persona che vuole generare circa 300 euro al mese in modo legale.

Regole di ricerca:
- Cerca la DOMANDA: annunci in cui privati, aziende, strutture o committenti cercano qualcuno, ad esempio "cerco persona", "cerco qualcuno", "cercasi", "cerco aiuto", "cerco collaboratore", "offro lavoro", "part-time", "lavoro occasionale".
- Non trasformare automaticamente un annuncio freelance/professionale in un'opportunità compatibile con chi non ha partita IVA.
- Dai priorità a lavori occasionali, part-time, incarichi concreti, collaborazioni saltuarie e richieste locali/online che potrebbero essere svolte dal profilo ricevuto.
- Per trasporto persone non suggerire attività che richiedono autorizzazioni o requisiti che il profilo non dimostra di avere; segnala sempre quando è necessario verificare autorizzazioni, assicurazione o inquadramento.
- Non proporre trading, scommesse, MLM/piramidi, richieste di pagamento anticipato, investimenti per ottenere un lavoro o offerte manifestamente sospette.
- Non inventare annunci, aziende, compensi o URL. Se non puoi verificare un dato, usa "Da verificare".
- Preferisci fonti/annunci con data recente e indica quando la data non è disponibile.
- Il limite contributivo di 5.000 euro non significa che ogni attività sotto tale cifra sia automaticamente esente o regolare: per gli aspetti fiscali/contrattuali usa sempre "da verificare" quando non sono espliciti.

Rispondi ESCLUSIVAMENTE con JSON valido, senza markdown e senza testo prima o dopo. Schema:
{
  "results": [
    {
      "title": "titolo annuncio/opportunità",
      "source": "sito o piattaforma",
      "url": "URL reale dell'annuncio o della pagina trovata",
      "searchUrl": "URL reale utile per verificare la fonte, se disponibile",
      "location": "località oppure Online",
      "compensation": "compenso dichiarato oppure Da verificare",
      "hours": "tempo/orario dichiarato oppure Da verificare",
      "type": "occasionale | part-time | subordinato | autonomo | collaborazione | altro | Da verificare",
      "partitaIva": "yes | no | unclear",
      "description": "breve descrizione basata sulla fonte",
      "why": "perché può essere coerente con il profilo, senza promettere che sia legalmente compatibile",
      "foundAt": "data dell'annuncio o Da verificare"
    }
  ]
}
Massimo 8 risultati. Elimina duplicati e risultati senza un URL verificabile.`;

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}

function extractJson(text) {
  let t = String(text || "").trim();
  if (t.startsWith("```") ) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "POST") return json({ error: "Metodo non consentito" }, 405, origin);
    if (!env.OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY non configurata nel Worker" }, 500, origin);

    let body;
    try { body = await request.json(); } catch { return json({ error: "JSON non valido" }, 400, origin); }
    const query = String(body?.query || "").trim();
    const profile = body?.profile || {};
    if (!query) return json({ error: "Query mancante" }, 400, origin);
    if (query.length > 4000) return json({ error: "Query troppo lunga" }, 400, origin);

    const userPrompt = `Profilo utente:\n${JSON.stringify(profile, null, 2)}\n\nRichiesta di ricerca:\n${query}\n\nCerca ora sul web e restituisci esclusivamente il JSON richiesto.`;

    const api = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] }
        ],
        max_output_tokens: 5000
      })
    });

    const raw = await api.text();
    if (!api.ok) {
      let detail = raw;
      try { detail = JSON.parse(raw)?.error?.message || raw; } catch {}
      return json({ error: `OpenAI: ${detail}` }, api.status, origin);
    }

    let response;
    try { response = JSON.parse(raw); } catch { return json({ error: "Risposta API non valida" }, 502, origin); }
    const text = response.output_text || response.output?.map(x => x.content?.map(c => c.text || "").join("")).join("") || "";

    try {
      const parsed = extractJson(text);
      const results = Array.isArray(parsed.results) ? parsed.results.slice(0, 8) : [];
      return json({ results }, 200, origin);
    } catch {
      return json({ error: "Il motore ha restituito un formato non interpretabile", raw: text.slice(0, 1000) }, 502, origin);
    }
  }
};
