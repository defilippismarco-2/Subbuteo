# Checklist delle dinamiche di gioco

Per ogni voce: rispondi con un dato (metrica, esperimento o riproduzione). Le soglie sono indicative per un gioco a turni breve come Calcio da Tavolo; se le superi, è un problema da riportare.

## 1. Equità strutturale
- **Vantaggio di chi inizia**: nel test specchio, chi batte il primo calcio d'inizio vince più del 60% su 24 o più partite? Allora il calcio d'inizio pesa troppo.
- **Vantaggio del lato**: a parità di livello il lato A e il lato B vincono in modo simile? La differenza deve stare dentro l'intervallo di confidenza.
- **Autogol**: più del 10% dei gol è autogol? Allora il controllo è poco prevedibile, oppure la CPU non valuta il rischio.

## 2. Abilità e scala della CPU
- **Livelli distinguibili**: ogni livello deve battere quello sotto almeno il 65% delle volte, con il limite inferiore dell'intervallo sopra il 50%.
- **Livello massimo**: deve essere battibile da un umano bravo, non perfetto. Cerca sequenze ripetibili che lo battono sempre (exploit), e tiri che sbaglia sempre.
- **Tempo di pensiero**: mediana sotto 150 ms e p95 sotto 400 ms su desktop (su telefono si moltiplica per 2-4).
- **Scelte assurde**: la CPU tira a vuoto (palla non toccata) più del 10% delle volte? Usa il portiere fuori dalle regole? Lascia la porta sguarnita?

## 3. Ritmo e durata
- **Durata della partita** (stimata, a 3 gol): idealmente tra 3 e 8 minuti. Sotto i 2 minuti è troppo casuale, sopra i 10 stanca.
- **Tiri per gol**: tra 6 e 15. Meno di 5: segnare è troppo facile. Più di 20: frustrante.
- **Tiri per turno e possesso**: se il possesso mantenuto supera il 75%, un giocatore può monopolizzare la palla e l'avversario guarda soltanto. Sotto il 30% la regola del tiro extra non conta.
- **Tempi morti**: tiri che arrivano al limite di 14 s, attese senza azione, partite bloccate (lo script le conta: devono essere 0).

## 4. Spazio e strategia
- **Mappa di calore della palla**: la palla deve girare per il campo. Se una zona (angoli, centro, una sola area) supera il 25% del tempo, cerca la causa: palla incastrata, attrito, una tattica dominante.
- **Strategia dominante**: esiste un tiro o una sequenza che dà più del 40% di gol per tiro da una posizione comune? Allora le altre scelte diventano inutili.
- **Varietà**: la CPU e il giocatore usano più pedine e più tipi di tiro (diretto, di sponda, appoggio)? Se un solo tipo copre quasi tutti i gol, la profondità è finta.
- **Rimonta**: chi va sotto di 2 gol riesce a vincere qualche volta? Se non succede mai, la partita è decisa troppo presto.

## 5. Oggetti (regole "Con poteri")
- **Impatto misurabile**: per ogni oggetto, prova la stessa situazione con e senza (20 o più ripetizioni). Se non c'è differenza, l'oggetto è solo estetico.
- **Fuori scala**: un oggetto che porta da solo a un gol in più del 60% degli usi rompe la partita.
- **Frequenza**: quanti oggetti per partita, e quanti restano in tasca inutilizzati? Un oggetto che nessuno usa ha un problema di chiarezza o di tempismo.
- **Contromosse**: ogni oggetto forte ha una risposta per l'avversario (VAR, cartellino, posizionamento)?
- **Oggetti d'oro**: la versione d'oro deve essere chiaramente migliore, ma non decidere da sola la partita.
- **Raccolta**: la squadra in vantaggio raccoglie più oggetti? Se sì, gli oggetti amplificano il divario invece di riaprire la partita.

## 6. Ostacoli e campi
- **Effetto reale**: ogni ostacolo cambia la traiettoria o il risultato in modo visibile (esperimento con e senza)?
- **Equità**: un ostacolo che compare vicino a una porta favorisce sistematicamente una squadra?
- **Leggibilità**: si capisce cosa fa un ostacolo senza leggere la legenda?
- **Campi**: tasso di gol e durata per campo (`--field`). Differenze sì, ma un campo dove non si segna mai o si segna sempre è un problema.

## 7. Controllo e sensazione (prova da giocatore)
- **Prevedibilità**: la linea di mira corrisponde a dove va davvero la pedina? Misura lo scarto tra anteprima ed esito.
- **Peso e feedback**: urti, gol, oggetti e ostacoli hanno un feedback visivo e sonoro proporzionato? Un effetto forte senza feedback sembra un bug.
- **Turni chiari**: si capisce sempre di chi è il turno, quanti tiri restano e perché il turno è passato?
- **Dito e schermo**: il dito copre la pedina o la mira? Gli elementi toccabili sono di almeno 44 px? Banner e overlay coprono il campo nel momento sbagliato?
- **Errori di tocco**: tocchi brevi o accidentali producono tiri non voluti?

## 8. Robustezza
- Errori JavaScript in console (devono essere 0).
- Stati impossibili: palla dentro una pedina, pedina fuori campo, portiere fuori area senza Portiere volante, turno che non passa mai.
- Pausa, ritorno al menu, rivincita e torneo durante situazioni particolari (gol, VAR, effetto in corso).
