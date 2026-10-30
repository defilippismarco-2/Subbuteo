# Calcio da Tavolo

Calcio a punta di dito per smartphone, pensato per giocare **in verticale**.
HTML5 + Canvas, senza dipendenze né build: basta aprire `index.html`.

## Modalità
- **Amichevole** contro la CPU (Facile / Normale / Difficile), scegliendo la tua nazionale e l'avversario.
- **2 giocatori** sullo stesso telefono.
- **Torneo** a eliminazione diretta con 8 nazionali (quarti, semifinale, finale). Scegli una sola nazionale e la tieni per tutto il torneo; la CPU diventa più forte a ogni turno. Il torneo resta salvato nel browser.

Nazionali: Brasile, Giappone, Italia, Argentina, Francia, Inghilterra, Olanda, Spagna, Germania, Portogallo.
Campi: Erba, Terra, Indoor, Street, Neve, Allenamento (o Casuale). Ogni campo ha un attrito diverso.
Palloni: Classico, Retrò, Neon, Invernale, Futsal, Galassia. La linea di mira prende il colore del pallone.

## Regole base
- Trascina all'indietro una tua pedina e rilascia per tirare. La linea tratteggiata mostra metà della corsa.
- Se una tua pedina tocca la palla tiri ancora, fino a 3 tiri per turno.
- Il portiere non può uscire dalla sua area.

## Regole "Con poteri"
Oggetti in campo: li prende chi ci passa sopra con una pedina o ci manda sopra la palla (massimo 2 in tasca).
Ogni oggetto ha 1 possibilità su 6 di essere d'oro, e almeno uno ogni 10 lo è.

| Oggetto | Effetto | Oro |
|---|---|---|
| Fiato | 4 tiri nel turno | 5 tiri |
| Palla di piombo | La pedina pesa il triplo per un tiro | Tutto il turno |
| Tiro a giro | Dopo la mira, trascina di lato per curvare | Curva anche la palla |
| Laser | Mostra il percorso della palla dopo l'impatto e allunga la mira del 60% | +100%, per 2 tiri |
| Dribbling | La palla resta attaccata alla pedina per un tiro | 2 tiri, la palla resta incollata |
| Cartellino giallo | Una pedina avversaria resta ferma nel suo prossimo turno | Due pedine |
| Portiere volante | Il portiere può uscire dall'area per il turno | Anche il turno dopo |
| VAR | Annulla l'ultimo tiro avversario | Annulla anche un gol |

Ostacoli per campo (compaiono e spariscono durante la partita):

| Campo | Ostacoli |
|---|---|
| Erba | Fango, irrigatore, vento, invasore di campo |
| Terra | Fango, sassi, vento, pendenza, cane in campo |
| Indoor | Pavimento bagnato, coni, barriera di sagome, invasore |
| Street | Tombini, pozzanghere, bidoni, pendenza, vento, skater |
| Neve | Ghiaccio, cumuli di neve, pupazzi di neve, vento |
| Allenamento | Coni, barriera di sagome, irrigatore, vento |

La CPU usa gli oggetti a tutti i livelli di difficoltà.

## Avvio in locale
```sh
python3 -m http.server 8000
# poi apri http://<ip-del-pc>:8000 dal telefono
```

## File
- `index.html` – struttura, menu e overlay
- `style.css` – layout mobile
- `game.js` – fisica, turni, oggetti, ostacoli, CPU, torneo, rendering, audio
