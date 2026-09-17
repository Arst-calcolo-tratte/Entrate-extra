const ALLOWED_ORIGIN = "https://arst-calcolo-tratte.github.io";
const MODEL = "gpt-5.6-luna";
const BUILD = "2026-09-17-v4";

const SYSTEM = `Sei il motore di ricerca dell'app "Assistente Entrate Extra".
Devi cercare opportunità REALI e RECENTI per una persona che vuole costruire circa 300 euro al mese in modo legale.

REGOLA ASSOLUTA: la compatibilità con il profilo reale viene prima del numero di risultati. È preferibile restituire 0-2 risultati davvero compatibili piuttosto che risultati generici.

PROFILO REALE DA RISPETTARE:
- autista NCC
- autista autobus/turismo
- Patente D e CQC persone
- esperienza nel trasporto e nel turismo
- conoscenza del territorio della Sardegna
- normale uso di strumenti digitali
- capacità di creare semplici pagine/web app, ma NON professionista sviluppatore, social media manager, marketer o consulente
- nessuna partita IVA dichiarata

NON PROPORRE:
- social media manager, digital marketing, SEO, marketing specialist
- sviluppatore/programmatore professionista, web designer professionista o grafico professionista
- consulente, commerciale, agente commerciale, procacciatore d'affari, venditore porta a porta
- commercialista, contabile, insegnante o altre professioni qualificate
- qualunque ruolo che richieda laurea, diploma specialistico, albo, abilitazione, certificazione o esperienza professionale specifica non dichiarata
- lavori che richiedano di imparare una nuova professione prima di poterli svolgere
- lavori che richiedano partita IVA obbligatoria se l'annuncio la rende esplicita
- lavori di sviluppo software, creazione siti, gestione social, marketing o servizi digitali professionali

AREE DA CERCARE CON PRIORITÀ:
1. autista/conducente/driver quando requisiti e autorizzazioni sono compatibili;
2. turismo, strutture ricettive, supporto operativo, accoglienza semplice, preparazione/assistenza non qualificata;
3. logistica, magazzino, movimentazione, consegne o supporto operativo quando compatibili con orari e requisiti;
4. lavori occasionali o saltuari pratici richiesti da privati o attività locali.

RICERCA:
- Cerca la DOMANDA: "cerco persona", "cerco qualcuno", "cercasi", "cerco aiuto", "cerco collaboratore", "offro lavoro", "part-time", "lavoro occasionale".
- Dai priorità a Sardegna e, per lavori online, a richieste realmente accessibili senza qualifica professionale.
- Preferisci annunci con mansioni, requisiti, luogo, compenso e orari verificabili.
- Considera il fatto che esiste già un lavoro principale: se gli orari rendono chiaramente incompatibile l'attività, scartala.

CONTROLLO OBBLIGATORIO:
Prima di restituire ogni risultato chiediti:
1. La persona sa già fare questo lavoro con le competenze indicate?
2. Richiede una qualifica o una competenza professionale non posseduta?
3. È plausibilmente conciliabile con un lavoro principale?
4. È accessibile nella zona/modalità richiesta?
5. L'URL è verificabile?
Se una risposta è negativa, SCARTA il risultato.

VINCOLI:
- Non proporre trading, scommesse, MLM/piramidi, investimenti o richieste di pagamento anticipato.
- Non inventare annunci, aziende, compensi, requisiti o URL.
- Per aspetti fiscali/contrattuali non espliciti usa "Da verificare". La soglia contributiva di 5.000 euro non rende automaticamente regolare o esente un'attività.
- Non cercare di arrivare a 8 risultati a tutti i costi.

Rispondi ESCLUSIVAMENTE con JSON valido:
{
  "results": [
    {
      "title": "titolo annuncio/opportunità",
      "source": "sito o piattaforma",
      "url": "URL reale",
      "searchUrl": "URL utile per verificare la fonte oppure Da verificare",
      "location": "località oppure Online",
      "compensation": "compenso oppure Da verificare",
      "hours": "orario/tempo oppure Da verificare",
      "type": "occasionale | part-time | subordinato | autonomo | collaborazione | altro | Da verificare",
      "partitaIva": "yes | no | unclear",
      "description": "descrizione breve basata sulla fonte",
      "why": "motivo concreto della compatibilità con le competenze già possedute",
      "foundAt": "data oppure Da verificare"
    }
  ]
}
Massimo 8 risultati.`;

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {"Access-Control-Allow-Origin": allowed,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json; charset=utf-8","Vary":"Origin","Cache-Control":"no-store"};
}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:corsHeaders(origin)});}
function extractJson(text){let t=String(text||"").trim();if(t.startsWith("```"))t=t.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();const first=t.indexOf("{");const last=t.lastIndexOf("}");if(first>=0&&last>first)t=t.slice(first,last+1);return JSON.parse(t);}

const HARD_EXCLUDE = /social\s*media|digital\s*marketing|marketing\s*(specialist|manager)|seo\s*(specialist|manager)?|commerciale|agente\s+commerciale|procacciatore|venditore|consulente|commercialista|contabile|programmatore|sviluppatore|web\s*designer|web\s*developer|sviluppo\s+software|creazione\s+siti|gestione\s+social|grafico\s*(professionista|pubblicitario)?|insegnante|laurea|abilitazione|iscrizione\s+all['’]?albo|partita\s*iva\s*(obbligatoria|required|necessaria)|p\.\s*iva\s*(obbligatoria|required|necessaria)/i;
const RELEVANT = /autista|conducente|driver|ncc|autobus|pullman|trasporto|turismo|hotel|albergo|b&b|struttura\s+ricettiva|accoglienza|facchino|facchinaggio|magazzino|logistica|consegna|corriere|movimentazione|supporto\s+operativo|pulizie|manutenzione|aiuto|occasionale|part[- ]?time/i;

function filterResults(results){
  return results.filter(x=>{
    const text=[x?.title,x?.description,x?.why].filter(Boolean).join(" ");
    if(HARD_EXCLUDE.test(text)) return false;
    if(!x?.url || !/^https?:\/\//i.test(x.url)) return false;
    return RELEVANT.test(text);
  }).slice(0,8);
}

export default {
  async fetch(request,env){
    const origin=request.headers.get("Origin")||ALLOWED_ORIGIN;
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(origin)});
    if(request.method!=="POST")return json({error:"Metodo non consentito",build:BUILD},405,origin);
    if(!env.OPENAI_API_KEY)return json({error:"OPENAI_API_KEY non configurata nel Worker",build:BUILD},500,origin);
    let body;try{body=await request.json();}catch{return json({error:"JSON non valido",build:BUILD},400,origin);}
    const query=String(body?.query||"").trim();
    const profile=body?.profile||{};
    if(!query)return json({error:"Query mancante",build:BUILD},400,origin);
    if(query.length>4000)return json({error:"Query troppo lunga",build:BUILD},400,origin);
    const userPrompt=`PROFILO UTENTE:\n${JSON.stringify(profile,null,2)}\n\nRICHIESTA DI RICERCA:\n${query}\n\nApplica i filtri in modo estremamente rigoroso. Meglio nessun risultato che un risultato incompatibile. Cerca ora sul web e restituisci esclusivamente il JSON richiesto.`;
    const api=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,tools:[{type:"web_search"}],input:[{role:"system",content:[{type:"input_text",text:SYSTEM}]},{role:"user",content:[{type:"input_text",text:userPrompt}]}],max_output_tokens:5000})});
    const raw=await api.text();
    if(!api.ok){let detail=raw;try{detail=JSON.parse(raw)?.error?.message||raw;}catch{}return json({error:`OpenAI: ${detail}`,build:BUILD},api.status,origin);}
    let response;try{response=JSON.parse(raw);}catch{return json({error:"Risposta API non valida",build:BUILD},502,origin);}
    const text=response.output_text||response.output?.map(x=>x.content?.map(c=>c.text||"").join("")).join("")||"";
    try{const parsed=extractJson(text);const results=filterResults(Array.isArray(parsed.results)?parsed.results:[]);return json({results,build:BUILD},200,origin);}catch{return json({error:"Il motore ha restituito un formato non interpretabile",raw:text.slice(0,1000),build:BUILD},502,origin);}
  }
};