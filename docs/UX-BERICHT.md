# UX- und UI-Bericht: Pomodoro Local-First

Stand: 19.11.2026 · Branch `experimental`

Der Bericht stützt sich auf eine Durchsicht aller Screens, Sheets, Stores und der
Timer-Logik. Die Befunde sind nach Bereichen gegliedert und gewichtet:

- **Hoch**: stört den Kernablauf (Fokussieren, Aufgaben abarbeiten) oder kann Daten verfälschen.
- **Mittel**: kostet regelmäßig Zeit oder sorgt für Unsicherheit.
- **Niedrig**: Feinschliff.

Am Ende steht, was in diesem Branch umgesetzt ist und was als nächster Schritt sinnvoll wäre.

---

## 1. Gesamteindruck

Die App ist optisch konsistent: Glasflächen, vier Farbwelten, klare Typografie, native
Sheets und eine durchdachte Local-First-Architektur. Die Bausteine (`Screen`, `Sheet`,
`ListGroup`, `ChoiceChips`, `TagChips`) werden sauber wiederverwendet, die Barrierefreiheit
ist bereits gut (Rollen, Labels, `accessibilityState`).

Die Schwächen liegen fast alle in der **Rückmeldung** und im **Fluss zwischen den Bereichen**:

1. Die App sagt selten, was gerade passiert ist. Eine Session wird still gespeichert, ein
   Timer läuft im Vordergrund ohne jedes Signal ab, angelegte Aufgaben erscheinen kommentarlos.
2. Der wichtigste Ablauf, nämlich „Aufgabe auswählen → fokussieren → abhaken“, braucht zu
   viele Schritte. Von der Aufgabenliste in den Timer geht es nur über den Detailscreen.
3. Einige Eingaben sind für das Telefon ungeeignet: Datum als Freitext `JJJJ-MM-TT`, Dauer in
   1-Minuten-Schritten bis 180.
4. Die Statistik zeigt Zahlen, aber keinen Bezug: kein Ziel, kein Vergleich, keine Serie.

---

## 2. Befunde nach Bereich

### 2.1 Timer

| # | Befund | Gewicht |
|---|--------|---------|
| T1 | **Kein Signal beim Ablauf im Vordergrund.** `reconcileWithClock` wechselt still in die Pause. Die Benachrichtigung kommt nur, wenn sie aktiviert ist. In der App fehlen Haptik und Hinweis, man verpasst das Ende leicht. | Hoch |
| T2 | **„Session beenden“ ohne Rückfrage und ohne Verwerfen.** Ein versehentlicher Tipp speichert sofort eine angebrochene Fokus-Session. `reset()` (Verwerfen) existiert im Store, ist aber nirgends erreichbar. | Hoch |
| T3 | **Pause vorzeitig beenden bleibt im Pausenmodus.** Nach „Beenden“ während einer Pause steht der Timer weiter auf „Kurze Pause“. Für die nächste Fokus-Session muss man das Modus-Sheet öffnen. Eine Taste „Pause überspringen“ fehlt, auch im Leerlauf. | Hoch |
| T4 | **Dauer nur in 1-Minuten-Schritten.** Von 25 auf 50 Minuten sind 25 Tipps nötig (Maximum 180). | Mittel |
| T5 | **Rundenanzeige während der langen Pause falsch.** Nach der vierten Fokus-Session springt der Zähler auf 0. Während der langen Pause steht dann „1 von 4“ mit einem gefüllten Punkt statt „4 von 4“. | Mittel |
| T6 | Keine Rückmeldung, dass und wie lang eine Session gespeichert wurde. | Mittel |
| T7 | Kein „Heute“-Wert auf dem Timer-Screen. Die Stoppuhr zeigt ihn, der Timer nicht. | Niedrig |
| T8 | Der Bildschirm kann während einer Session ausgehen (kein Keep-Awake). | Niedrig |

### 2.2 Stoppuhr

| # | Befund | Gewicht |
|---|--------|---------|
| S1 | **Sekunden-Sessions werden als 1 Minute gespeichert.** `stop()` speichert jede Session mit `activeElapsedSeconds > 0` und mindestens einer Minute. Zwei Sekunden Start/Stopp erzeugen also einen Statistikeintrag. Der Timer verwirft dagegen alles unter einer halben Minute. | Hoch |
| S2 | Keine Rückmeldung nach dem Stoppen (gespeichert? wie lang? welcher Tag?). | Mittel |
| S3 | Die Doppelbedeutung von „Pause“ (Stoppuhr-Phase gegenüber Timer-Pause) ist erklärungsbedürftig. Die Statuszeile hilft, ein Untertitel wie „Pausenzeit zählt nicht zur Fokuszeit“ wäre klarer. | Niedrig |

### 2.3 Aufgaben

| # | Befund | Gewicht |
|---|--------|---------|
| A1 | **Schnelles Anlegen nur in der Kalenderansicht.** In der Liste (Standardansicht) öffnet „+“ einen ganzen Screen mit Pflichtfeldern. Für eine kurze Notiz ist das zu schwer. | Hoch |
| A2 | **Kein direkter Weg von der Aufgabe in den Fokus.** „Im Timer verwenden“ steckt im Detailscreen unter Sichern/Löschen: drei Tipps und ein Screenwechsel für den wichtigsten Ablauf der App. | Hoch |
| A3 | **Überfällige Aufgaben lassen sich nur einzeln verschieben**, jeweils über den Detailscreen. | Mittel |
| A4 | Abschnittsüberschriften ohne Anzahl. Bei langen Listen fehlt der Überblick. | Niedrig |
| A5 | Ungesicherte Änderungen im Detailscreen gehen beim Zurück-Wischen ohne Rückfrage verloren. | Mittel |
| A6 | Der Leertext „Lege oben rechts die erste Aufgabe an.“ verweist auf die einzige, umständliche Anlegemöglichkeit. | Niedrig |
| A7 | Keine Wischgesten (abhaken, verschieben, löschen), wie man sie aus Erinnerungs-Apps kennt. | Niedrig |
| A8 | Keine Aufwandsschätzung („3 Pomodoros“) und kein Fortschritt je Aufgabe. Die Statistik kennt die Zeit je Aufgabe, die Aufgabenliste zeigt sie nicht. | Mittel |

### 2.4 Statistik

| # | Befund | Gewicht |
|---|--------|---------|
| ST1 | **Balken sind nicht antippbar.** Für den Wert eines Tages muss man auf „Tag“ wechseln und zurückblättern. | Mittel |
| ST2 | **Kein Vergleich** mit dem vorigen Zeitraum, also keine Antwort auf „War diese Woche besser?“. | Mittel |
| ST3 | **Tagesziel unsichtbar.** Es existiert nur als Benachrichtigungseinstellung, Fortschritt wird nirgends angezeigt. | Mittel |
| ST4 | Keine Serie (Streak), die zum Dranbleiben motiviert. | Mittel |
| ST5 | „Session nachtragen“: **Datum als Freitext `JJJJ-MM-TT`, Zeiten als Freitext.** Auf dem Telefon fehleranfällig, die Dauer sieht man erst nach dem Speichern. | Hoch |
| ST6 | Eine nachgetragene Session lässt sich keiner Aufgabe zuordnen, nur einem Tag. | Niedrig |
| ST7 | Im Session-Sheet lassen sich Start, Ende und Dauer nicht korrigieren. | Mittel |
| ST8 | Sessionliste nicht nach Tagen gegliedert. Bei „Monat“ wiederholt jede Zeile das Datum. | Niedrig |

### 2.5 Einstellungen und Onboarding

| # | Befund | Gewicht |
|---|--------|---------|
| E1 | Das Tagesziel ist ein Ziel, keine Benachrichtigung. Es gehört in einen eigenen Bereich „Ziele“ und sollte auch ohne Benachrichtigung wirken. | Mittel |
| E2 | Rohe Sync-Fehlermeldungen (`Fehlgeschlagen: …`) zeigen technische Texte. | Niedrig |
| E3 | Beim ersten Start fragt die App vor allem anderen nach einer UUID. Für eine Local-First-App wäre „Erst ausprobieren, später verbinden“ der freundlichere Einstieg. „Später“ existiert, ist aber nur die zweite Taste. | Niedrig |

### 2.6 Übergreifend

| # | Befund | Gewicht |
|---|--------|---------|
| G1 | **Gemischte Sprache in Fehlermeldungen.** Viele Stores werfen englische Texte (`Task not found`, `Title is required`, `Minutes must be greater than zero`), die als `Alert` direkt beim Nutzer landen. | Mittel |
| G2 | **Kein Toast- bzw. Snackbar-Muster.** Rückmeldung gibt es nur als modalen `Alert`, der den Fluss unterbricht und für Erfolgsmeldungen zu schwer ist. | Hoch |
| G3 | Läuft der Timer, sieht man das in anderen Tabs nicht (kein Badge, keine Mini-Leiste). | Mittel |
| G4 | Stoppuhr und Timer sind zwei Tabs mit fast identischem Aufbau (`SessionStage`). Zusammengelegt zu einem Tab „Fokus“ mit Umschalter würde ein Tab-Platz frei, etwa für „Heute“. | Niedrig (strukturell) |

---

## 3. Neue Features und Ausbau bestehender Features

Nach Nutzen und Aufwand sortiert.

### 3.1 Hoher Nutzen, geringer Aufwand

1. **Rückmeldung per Toast** (G2, T6, S2): kurze, nicht modale Meldung mit optionaler Aktion,
   zum Beispiel „Session gespeichert · 25 Min. · Mathe [Bearbeiten]“.
2. **Fokus direkt aus der Aufgabenliste** (A2): eine Play-Taste je offener Aufgabe wählt sie
   im Timer und wechselt dorthin.
3. **Schnelleingabe in der Liste** (A1): dasselbe Eingabefeld wie im Kalender. Ein aktiver
   Tag-Filter wird übernommen.
4. **„Alle auf heute“ für überfällige Aufgaben** (A3).
5. **Pause überspringen** (T3) und **Verwerfen statt Speichern** beim vorzeitigen Beenden (T2).
6. **Sinnvolle Dauer-Schritte** (T4): unter 10 Minuten in 1er-, darüber in 5er-Schritten.
7. **Antippbare Balken** mit Sprung in den Tag bzw. Monat (ST1).

### 3.2 Hoher Nutzen, mittlerer Aufwand

8. **Ziele sichtbar machen** (ST3, E1): Fortschritt zum Tagesziel auf dem Stoppuhr-Screen und
   in der Tagesstatistik.
9. **Serie und Vergleich** (ST2, ST4): „Serie: 5 Tage“, „+18 % ggü. Vorwoche“.
10. **Besseres Nachtragen** (ST5): Schnellwahl für Datum (Heute/Gestern) und Dauer (25/50/60 Min.),
    Live-Anzeige der berechneten Dauer, Zifferntastatur.
11. **Aufwandsschätzung je Aufgabe** (A8): geschätzte Pomodoros, Fortschritt „2/4“ in der Zeile,
    gespeiste aus den vorhandenen Sessions.
12. **Session-Zeiten bearbeiten** (ST7): Start und Ende im Session-Sheet korrigieren.
13. **Laufende Session überall sichtbar** (G3): Badge am Timer-Tab oder eine schmale Live-Leiste.

### 3.3 Größere Vorhaben

14. **Live Activity / Dynamic Island und dauerhafte Benachrichtigung auf Android** mit Restzeit
    und Pause/Weiter.
15. **Automatischer Start der nächsten Phase** (Pause → Fokus) als Option, mit einem
    5-Sekunden-Countdown zum Abbrechen.
16. **Tab „Heute“**: Tagesziel, heutige und überfällige Aufgaben, letzte Sessions und ein großer
    Start-Knopf auf einer Seite. Voraussetzung ist G4 (Stoppuhr und Timer zusammenlegen).
17. **Fokus-Modus des Systems koppeln** (iOS Focus Filter / Android DND) während einer Fokus-Session.
18. **Wochenrückblick**: kurze Zusammenfassung am Sonntagabend (Benachrichtigung mit Link in die Statistik).
19. **Export** der Sessions als CSV.
20. **Widgets** (Home-Screen): Restzeit bzw. heutiger Fortschritt.

---

## 4. Umsetzung in diesem Branch

Umgesetzt wurden die Punkte, die den Kernablauf am stärksten verbessern und ohne neue
native Abhängigkeiten auskommen:

| Bereich | Umsetzung | Befund |
|---------|-----------|--------|
| Übergreifend | Toast-System (`uiStore` + `Toast`) mit optionaler Aktion, im Root-Layout eingebunden | G2 |
| Übergreifend | Fehlermeldungen der Stores und Repositories auf Deutsch | G1 |
| Timer | Haptik und Toast beim Ablauf; Toast mit „Bearbeiten“ nach gespeicherter Session | T1, T6 |
| Timer | Vorzeitiges Beenden einer Fokus-Session fragt nach: Speichern, Verwerfen oder Weitermachen | T2 |
| Timer | Pause vorzeitig beenden wechselt zu Fokus; „Pause überspringen“ auch im Leerlauf | T3 |
| Timer | Dauer-Schritte 1 Min. unter 10, darüber 5 Min. (auf Fünfer gerundet) | T4 |
| Timer | Rundenanzeige korrekt in kurzen und langen Pausen | T5 |
| Stoppuhr | Sessions unter 30 Sekunden werden verworfen, mit Hinweis; sonst Toast mit „Bearbeiten“ | S1, S2 |
| Stoppuhr | „Heute“-Kapsel zeigt Fortschritt zum Tagesziel | ST3 |
| Aufgaben | Schnelleingabe in der Listenansicht (übernimmt den Tag-Filter), Toast mit „Bearbeiten“ | A1, A6 |
| Aufgaben | Play-Taste je offener Aufgabe: wählt sie im Timer und wechselt dorthin | A2 |
| Aufgaben | „Alle auf heute“ bei überfälligen Aufgaben; Anzahl in jeder Abschnittsüberschrift | A3, A4 |
| Statistik | Balken antippbar (Woche/Monat → Tag, Gesamt → Monat) | ST1 |
| Statistik | Vergleich mit dem vorigen Zeitraum, Serie aktiver Tage, Tagesziel in der Tagesansicht | ST2, ST3, ST4 |
| Statistik | Nachtragen: Schnellwahl für Datum und Dauer, Live-Dauer, Zifferntastatur | ST5 |

Neue reine Logik liegt in `src/utils/` und ist mit Tests abgedeckt (`timerCycle`,
`timerDurations`, `stats`).

### Bewusst nicht umgesetzt

- **A5 (Rückfrage bei ungesicherten Änderungen)**: braucht `usePreventRemove` über Stack, Tabs
  und Sheets hinweg und sollte auf dem Gerät getestet werden.
- **G3, G4, 14–20**: strukturelle Änderungen oder neue native Module (Keep-Awake, Live
  Activities, Widgets). Sie brauchen eine eigene Entscheidung und einen Gerätetest.
- **A8, ST7**: benötigen Schemaänderungen (Migration v13) und Anpassungen an der Sync-Payload
  im Backend.
