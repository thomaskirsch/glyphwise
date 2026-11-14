# Recherche: Wie lernt man eine fremde Schrift – und was dürfen wir verwenden?

Stand: November 2026. Grundlage für die Entscheidungen in diesem Projekt.

## 1. Wie man eine Schrift lernt

- **Mit der Hand schreiben hilft beim Erkennen.** Erwachsene, die neue Zeichen
  von Hand geschrieben haben, erkannten sie später besser und länger als nach
  dem Tippen ([Longcamp et al. 2008](https://pubmed.ncbi.nlm.nih.gov/18201124/)).
  Ein Teil des Effekts kommt wohl vom genauen Hinschauen. Deshalb kombinieren
  wir Nachzeichnen mit Erkennungs-Übungen.
- **Kleine Gruppen von 4–6 Zeichen pro Einheit.** Leicht verwechselbare Zeichen
  kommen nicht in dieselbe Einheit. Bei Hebräisch sind das zum Beispiel
  ב/כ, ד/ר/ך, ה/ח/ת, ו/ז/ן und ס/ם. Sie werden später gezielt gegenübergestellt.
- **Möglichst früh echte Wörter.** Jede Einheit schaltet Wörter frei. Mit ש ל ו מ
  kann man sofort שלום (Schalom) lesen. Lehnwörter wie קפה (Kaffee) und
  טלפון (Telefon) sind besonders motivierend, weil man ihre Bedeutung schon kennt.
- **Abrufen über Tage verteilt** (Spaced Repetition). Für die 27 hebräischen
  Formen würde Leitner reichen. Für Kanji (über 2000 Zeichen) lohnt sich FSRS,
  deshalb nutzen wir von Anfang an [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).
- **Merkhilfen,** die Form und Laut verbinden. Wir schreiben sie selbst und
  kopieren nichts aus Kursen.
- **Verschiedene Aufgabentypen:**
  1. ansehen
  2. nachzeichnen
  3. Zeichen sehen und den Laut wählen
  4. hören und das Zeichen wählen
  5. frei aus dem Gedächtnis schreiben
  6. Wörter lesen
- **Kurze Einheiten** von 5–10 Minuten.

## 2. Besonderheiten des Hebräischen

- 22 Buchstaben und 5 Endformen (ך ם ן ף ץ) ergeben 27 Formen. Geschrieben wird
  von rechts nach links.
- **Druckschrift und Schreibschrift** unterscheiden sich stark. Gelernt wird
  meist zuerst die Druckschrift. Im Alltag schreiben Israelis aber in
  Schreibschrift ([Überblick](https://www.mezzoguild.com/learn/hebrew/alphabet/)).
  Beide Schriften brauchen deshalb ein eigenes Strich-Set.
- **Punkte verändern den Laut:**
  - Dagesch: בּ/ב (b/w), כּ/כ (k/ch), פּ/פ (p/f)
  - שׁ/שׂ (sch/s)
  - Die Vokalzeichen (Nikud) kommen später.
- **Strichreihenfolge:** Es gibt keinen offenen Datensatz und keine so feste
  Norm wie im Chinesischen. Wir erstellen die Daten selbst und markieren sie
  mit `verified: false`, bis ein Muttersprachler sie geprüft hat.

## 3. Quellen und Lizenzen

| Bereich | Quelle | Lizenz | Verwendbar? |
|---|---|---|---|
| Kana und Kanji (Striche) | [KanjiVG](https://kanjivg.tagaini.net/) | CC BY-SA 3.0 | ja |
| Chinesisch (Striche) | [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) | Arphic Public License | ja, als eigenes Datenpaket |
| Strichbewertung | [Hanzi Writer](https://github.com/chanind/hanzi-writer) ([Methode](https://chanind.github.io/2019/03/15/shape-matching-in-javascript.html)) | MIT | Idee übernommen |
| Hebräisch und Arabisch (Striche) | – | – | selbst erstellen |
| Fonts | Noto Sans Hebrew / Arabic / JP | OFL | ja |
| Sprachausgabe | die Stimme des Geräts (Android TTS, iOS mit he-IL) | – | ja, erste Wahl |
| Aufnahmen | Wikimedia Commons, Lingua Libre, Common Voice (CC0) | CC0 / CC BY-SA | ja, jede Datei einzeln prüfen |
| Hebräische Stimmen | [Phonikud](https://phonikud.github.io/)-TTS, ILSpeech, Meta MMS | nicht-kommerziell | **nein** |
| Wiederholungsplanung | ts-fsrs | MIT | ja |

## 4. Lizenz und Recht

- Ein Verbot kommerzieller Nutzung wäre kein Open Source mehr. Wir wählen
  deshalb **Copyleft**:
  - Der **Code** steht unter **MPL-2.0**. Die GPL verträgt sich nicht mit dem
    Apple App Store; [VLC](https://www.computerworld.com/article/1347653/gplv2-blocks-vlc-from-apple-s-app-store.html)
    ist deshalb auf MPL-2.0 gewechselt.
  - Die **Inhalte** stehen unter **CC BY-SA 4.0**. Das ist mit KanjiVG
    (BY-SA 3.0) kompatibel.
- **Beiträge** laufen über das DCO (Signed-off-by). Eine Rechteübertragung (CLA)
  ist nicht nötig.
- **Keine persönlichen Daten:** Commits laufen über die GitHub-noreply-Adresse,
  und es kommen keine Aufnahmen von Personen ins Repo.
- **Datenschutz:** kein Konto, kein Tracking, keine Internet-Berechtigung. Der
  Lernstand lässt sich als JSON exportieren.

## 5. Was nicht geht oder Aufwand macht

- Für Hebräisch und Arabisch gibt es **keine fertigen Strichdaten**. Wir müssen
  sie selbst erstellen und von Muttersprachlern prüfen lassen.
- Es gibt **keine freie hebräische Stimme**, die man mitliefern dürfte. Deshalb
  nutzen wir die Stimme des Geräts; ihre Qualität hängt vom Gerät ab.
- **iOS:**
  - Zum Bauen braucht man einen Mac. Kostenlos geht das über GitHub Actions
    (bei öffentlichen Repos).
  - Sideloading mit einer kostenlosen Apple-ID funktioniert 7 Tage lang, für
    höchstens 3 Apps. Der App Store kostet 99 $ pro Jahr.
  - Am einfachsten ist die PWA: in Safari „Zum Home-Bildschirm“ wählen.
- **Google Play:**
  - Das Konto kostet einmalig 25 $.
  - Neue private Konten müssen vorher einen geschlossenen Test machen
    (12 Tester, 14 Tage).
  - Der Name des Entwicklers ist öffentlich sichtbar.
- **Android-Entwicklerverifizierung:** Sie gilt seit dem 30.09.2026 in ersten
  Ländern und soll 2027 weltweit kommen. Betroffen sind auch APK-Dateien und
  F-Droid ([F-Droid-Stellungnahme](https://f-droid.org/2026/02/24/open-letter-opposing-developer-verification.html)).
- **Arabisch:** Jeder Buchstabe hat bis zu 4 Formen je nach Position, und die
  Buchstaben werden verbunden geschrieben.

## 6. Spätere Erweiterungen

- **Hebräisch:** Schreibschrift, Nikud, Lesen von Wörtern und Sätzen
- **Japanisch:** Hiragana und Katakana (KanjiVG), danach Kanji
- **Hangul:** gut geeignet, mit 24 Grundzeichen und klaren Regeln
- **Weitere Schriften:** Arabisch, Chinesisch, Griechisch, Kyrillisch,
  Georgisch, Devanagari
- **Bedienung:**
  - Stiftdruck
  - Modus für Linkshänder
  - Dunkelmodus
  - große Schrift
  - Übersetzungen durch die Community

## 7. Motivation für Erwachsene

- Schlichte Gestaltung. Kindliches Design schreckt Erwachsene ab.
- Sichtbarer Fortschritt, zum Beispiel „19 von 27 Formen“ und „Du kannst jetzt
  X Wörter lesen“.
- Ein Tagesziel und eine Streak mit Schutzschild. Keine Ranglisten und keine
  roten Fehlerzähler.
- Sanfter Umgang mit Fehlern: die Lösung zeigen, die Animation wiederholen und
  am Ende eine Wiederholungsrunde.
- Ein Zeichen gilt als „gemeistert“, wenn es mindestens 6 Versuche gab und
  davon mindestens 80 % beim ersten Mal richtig waren.
