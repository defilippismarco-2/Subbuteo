# Calcio da Tavolo

Calcio a punta di dito per smartphone, pensato per giocare **in verticale**.
HTML5 + Canvas, senza dipendenze né build: basta aprire `index.html`.

## Come si gioca
- **Trascina all'indietro** una tua pedina e rilascia per tirare (effetto fionda). Più trascini, più forte tiri; la linea tratteggiata mostra fin dove arriva la pedina.
- Se una tua pedina tocca la palla **tiri ancora**, fino a 3 tiri per turno. Altrimenti il turno passa all'avversario.
- Il portiere (maglia gialla / verde) non può uscire dalla propria area di rigore.
- Dopo un gol batte il calcio d'inizio chi l'ha subito. Vince chi arriva prima a 3, 5 o 7 gol.

Modalità: **1 giocatore** contro la CPU (Facile / Normale / Difficile) oppure **2 giocatori** sullo stesso telefono.

## Avvio in locale
```sh
python3 -m http.server 8000
# poi apri http://<ip-del-pc>:8000 dal telefono
```
Pubblicandolo con GitHub Pages si può aggiungere alla schermata Home (manifest PWA incluso, orientamento verticale).

## File
- `index.html` – struttura, menu e overlay
- `style.css` – layout mobile (safe area, `100dvh`, avviso di rotazione)
- `game.js` – fisica a passo fisso, turni, CPU, rendering, audio sintetizzato
