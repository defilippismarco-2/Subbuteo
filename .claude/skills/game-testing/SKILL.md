---
name: game-testing
description: Game testing critico e analitico di Calcio da Tavolo (o di un altro gioco del repository). Usala quando l'utente chiede di testare il gioco, fare playtest, valutare il bilanciamento, capire se una meccanica, un oggetto, un ostacolo o un livello della CPU funziona davvero, trovare strategie dominanti o bug di gameplay, o avere un parere sincero sulle dinamiche di gioco. Misura con partite simulate e prove mirate invece di dare impressioni, e riporta i problemi in ordine di gravità con prove e proposte.
---

# Game testing critico

Il tuo ruolo è quello di un game tester esigente: cerchi i problemi, non conferme.
Un giudizio senza una misura o una riproduzione non vale. Se qualcosa funziona, lo dici in una riga e con il dato che lo dimostra; il resto dello spazio va ai problemi.

## Principi

- **Prove prima delle opinioni.** Ogni affermazione sul gameplay deve poggiare su almeno una di queste: una metrica da partite simulate, un esperimento A/B controllato, una riproduzione passo passo, uno screenshot.
- **Il giocatore prima del codice.** Un problema conta per quello che fa provare a chi gioca (frustrazione, noia, confusione, ingiustizia), non per com'è scritto.
- **Distingui le categorie:** bug (il gioco non fa ciò che dichiara), bilanciamento (numeri sbagliati), dinamica (le regole producono comportamenti indesiderati, per esempio una strategia dominante), sensazione (feedback, ritmo, peso), leggibilità e interfaccia.
- **Dichiara l'incertezza.** Con pochi campioni dai l'intervallo di confidenza (lo script lo calcola per il tasso di vittoria). Non scrivere "bilanciato" se l'intervallo va dal 30% al 70%.
- **Confronta con l'intenzione.** Leggi cosa il gioco promette (README, legenda, descrizioni degli oggetti) e verifica che accada davvero.
- **Non modificare il gioco durante il test.** Sono ammessi solo hook di test; se ne aggiungi uno, dillo nel report.

## Procedura

### 1. Mappa le meccaniche e formula le domande
Leggi `README.md`, la legenda e le costanti in `game.js` (attrito, masse, tiri per turno, oggetti, ostacoli, livelli CPU). Scrivi per te un elenco di 5-10 domande verificabili, per esempio:
- "Chi inizia la partita ha un vantaggio?"
- "Un livello della CPU batte davvero quello sotto?"
- "Il Laser cambia l'esito dei tiri o è solo estetico?"
- "Esiste un tiro che segna quasi sempre?"
Le domande guidano gli esperimenti; non fare test a caso.

### 2. Playtest automatico (numeri di base)
Lo script gioca partite in avanti veloce usando gli hook `window.__game` e `window.__step`. Il lato A (in basso, il giocatore) è guidato dal cervello della CPU al livello scelto.

```sh
node .claude/skills/game-testing/scripts/playtest.js --matches 24 --a 2 --b 2 --rules classica --parallel 4
node .claude/skills/game-testing/scripts/playtest.js --matches 24 --a 2 --b 4 --rules poteri --out /tmp/pt.json
```

Opzioni: `--a`/`--b` livelli (2 Normale, 3 Difficile, 4 Estremo), `--rules classica|poteri`, `--field <id>|casuale`, `--target <gol>`, `--parallel <pagine>`, `--out <file json>` (contiene anche i dati grezzi di ogni tiro), `--url`.

Esegui almeno:
- **specchio** (`--a 2 --b 2`, classica): misura i vantaggi strutturali (chi inizia, lato del campo) senza differenze di abilità;
- **scala dei livelli** (2 contro 3, 3 contro 4, 2 contro 4): ogni livello deve battere chiaramente quello sotto;
- **con poteri** contro **classica** allo stesso livello: cosa cambiano oggetti e ostacoli;
- **per campo** (`--field ...`) se il dubbio riguarda un campo.

Usa 24 o più partite per un confronto; con meno, presenta il risultato come indizio.

Se gli hook non esistono (altro gioco), aggiungi un hook minimo che esponga lo stato e un passo della simulazione, e adatta lo script: la struttura (bot, rilevazione di inizio e fine tiro, metriche) resta valida.

### 3. Esperimenti mirati
Per ogni meccanica sospetta prepara uno scenario controllato: stessa posizione, stesso tiro, una sola variabile cambiata, almeno 20 ripetizioni. Esempio già usato con successo: tiro dritto sul portiere con e senza Palla di piombo (0 gol su 20 contro 19 su 20). Riporta la differenza come "X su N contro Y su N".
Per costruire uno scenario: `startMatch(...)`, poi `S.paused = true`, piazza pedine e palla, chiama `shoot(...)` e avanza con `window.__step(1/240)` fino a fine tiro (vedi `scripts/playtest.js` per gli hook disponibili).

### 4. Prova da giocatore
Le metriche non vedono la sensazione di gioco. Apri il gioco con Playwright su un viewport da telefono (per esempio `devices['Pixel 7']`), usa tocchi veri (`Input.dispatchTouchEvent` via CDP) e fai screenshot nei momenti chiave: mira, impatto, gol, uso di un oggetto, ostacoli, menu. Controlla:
- se si capisce di chi è il turno, quanti tiri restano, cosa fa un oggetto;
- se il dito copre ciò che serve vedere;
- se gli elementi toccabili sono di almeno 44 px;
- se banner e overlay coprono informazioni nel momento in cui servono;
- se ogni azione ha un feedback visibile e sonoro proporzionato.

### 5. Analisi
Passa i dati attraverso la checklist in `references/criteria.md`. Per ogni voce rispondi con un dato, non con un'impressione. Le soglie indicative sono nella stessa checklist.

### 6. Report
Scrivi in italiano, in modo diretto e senza complimenti di riempimento. Struttura:

1. **Sintesi**: 3-5 righe con il giudizio complessivo e i 2-3 problemi più gravi.
2. **Problemi**, dal più grave al meno grave. Per ognuno:
   - *Cosa succede* (una frase dal punto di vista del giocatore);
   - *Prova* (metrica con campione e intervallo, oppure esperimento "X su N", oppure passi per riprodurlo, oppure screenshot);
   - *Perché conta* (effetto su chi gioca);
   - *Proposta* concreta (quale numero o regola cambiare, e in che direzione);
   - *Come verificare la correzione* (quale comando o esperimento rieseguire e quale risultato aspettarsi).
   Gravità: **Bloccante** (partita rotta o bloccata), **Alta** (strategia dominante, livello non distinguibile, oggetto inutile o fuori scala), **Media** (squilibrio misurabile, feedback mancante), **Bassa** (rifiniture).
3. **Cosa funziona**: al massimo 3 righe, solo con il dato a sostegno.
4. **Esperimenti consigliati**: cosa misurare dopo, per i dubbi rimasti aperti.
5. **Limiti del test**: cosa non hai potuto verificare (per esempio un telefono vero o un giocatore umano reale) e quanto pesa sulle conclusioni.

Se l'utente lo chiede, pubblica il report come documento o pagina; altrimenti rispondi in chat.
