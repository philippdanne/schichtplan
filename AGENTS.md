# Schichtplaner — Projektkonventionen

Helfer-Einsatzplanung für Veranstaltungen (Schützenfeste u. Ä.). Eine Codebase
für Web, iOS und Android via Expo + react-native-web.

Ursprung: Klick-Prototyp aus Claude Design, siehe `design/` (Handoff-Bundle,
inkl. Chat-Transkript unter `design/chats/chat1.md`). Die eigentliche
Implementierung lebt in `src/`.

## Stack

- Expo (React Native) + react-native-web — eine Codebase für alle Plattformen
- Backend: Supabase (Postgres + Realtime), Schema in `supabase/migrations/`
- Auth: Supabase Auth (siehe unten — **Admin-Bereich erfordert Login**)
- Drag & Drop: `@dnd-kit/core`, nur aktiv auf Web ab Tablet-Breite (siehe
  `src/shared/platform/useDragDropEnabled.ts`)
- PDF-Export: `src/shared/print/exportSchedulePdf.ts`, gleiches
  Platform.OS-Verzweigungsmuster wie beim Drag & Drop. Web: `window.print()`
  über ein verstecktes `<iframe srcdoc>` (kein Popup-Blocker-Risiko, keine
  Live-App-DOM im Druckpfad). Nativ (iOS/Android): `expo-print` rendert den
  HTML-String per WebView zu einer echten PDF-Datei, `expo-sharing` reicht
  sie ans Share-Sheet weiter. Beide Pfade nutzen dasselbe Template aus
  `src/shared/print/buildScheduleHtml.ts` (reine Funktion, exportiert die
  tagesweise gruppierte Liste des ganzen Events — nicht die
  Drag&Drop-Timeline, die druckt sich nicht sinnvoll). Tages-Formatierung/
  -Gruppierung (`formatDayLabel`, `groupShiftsByDay`, …) liegt gebündelt in
  `src/shared/format/schedule.ts`, von Admin, Helfer und PDF-Template
  gemeinsam genutzt.

## Auth — WICHTIG, Stand aktualisiert

Frühere Projektstände sahen **bewusst keine Authentifizierung** vor. Das hat
sich geändert:

- **Admin-Bereich** (Events/Schichten anlegen, Helfer zuweisen, Helfer
  anlegen) **erfordert jetzt eine Supabase-Auth-Session**. Siehe
  `src/features/admin/AdminGate.tsx`.
- **Helfer-Ansicht bleibt ohne Login** — rein lesend, kein Auth-Check, per
  Design-Vorgabe.
- **Share-Link** (`src/shared/data/shareLink.ts`): Admin-Button "An Helfer
  teilen" hängt `?event=<id>` an die aktuelle URL. Da die Helfer-Ansicht
  bereits login-frei und rein lesend ist, ist "passwortlos teilen" damit
  bereits erfüllt — der Link muss nur direkt zum richtigen Event
  durchspringen. `App.tsx` liest den Parameter einmalig beim Start
  (`getSharedEventId()`), erzwingt Helfer-Modus und reicht die Event-ID an
  `HelferScreen` durch. Web-only (kein `window.location` auf nativ). Über
  einen Share-Link rendert `App.tsx` den äußeren `Header` gar nicht erst —
  `HelferScreen` hat seit dem Mobil-Redesign (siehe unten) ihre eigene
  Titel-/Event-Auswahl-Zeile, der äußere "Schichtplaner"-Header wäre dort
  nur redundantes Chrome auf kostbarem Handy-Bildschirmplatz.
- Jede eingeloggte Person gilt als Admin — es gibt keine separate
  Admin-Rolle/-Tabelle. Die RLS-Policies in `supabase/migrations/0001_init.sql`
  gewähren Schreibzugriff an jede `authenticated`-Session.
- Das aktuelle Sign-in-Formular (`src/features/admin/SignInForm.tsx`) ist ein
  **funktionaler Platzhalter**. Das finale Auth-UI wird separat in Claude
  Design entworfen und ersetzt dieses Formular — die Verdrahtung
  (`useAuth`, Supabase-Session, Gate) bleibt dabei bestehen.
- Ohne konfiguriertes Supabase-Projekt (kein `.env`) läuft der Admin-Bereich
  lokal ungeschützt mit Mock-Daten weiter (sichtbar als Banner) — es gibt
  sonst keine Möglichkeit, lokal ohne Backend eine Session zu erzeugen.

## Schichten über Mitternacht

Eine Schicht darf über 00:00 hinausgehen (z. B. 20:00–01:00). Erkennung:
Ende ≤ Start im Formular bedeutet "endet am nächsten Tag" — kein separates
Datumsfeld nötig. `AdminScreen.tsx`s Save-Handler berechnet das Enddatum
entsprechend (`addDays` aus `schedule.ts`); die DB-Check-Constraint
(`end_time > start_time`) bleibt dadurch immer erfüllt. Damit eine solche
Schicht in der Timeline sichtbar ist, muss der Tag selbst über Mitternacht
hinaus laufen (Tag-Ende in der Toolbar entsprechend spät setzen, z. B.
02:00) — die vorhandene Tag-Zeitspannen-Logik (`Timeline.tsx`,
`resolveMin`/`spansMidnight`) rendert die Schicht dann automatisch korrekt
in die verlängerte Spalte hinein.

## Helfer-Ansicht — Mobil-Redesign

`HelferScreen.tsx` wurde komplett aus dem Claude-Design-Handoff
`design/project/Helferansicht Mobil.dc.html` umgesetzt (gleiches
`support.js` wie das ursprüngliche Design, siehe HANDOFF-README.md).
Zentrale Punkte, falls das Design nochmal angepasst/nachimportiert wird:

- **"Wer bist du?"**-Flow ersetzt den alten Namensfilter komplett: großer
  Auswahl-Button → Panel mit Suche + Namensliste (nur Namen, die in
  diesem Event tatsächlich irgendwo zugewiesen sind, nicht der ganze
  Helfer-Pool) + Option, einen nicht gelisteten Namen frei zu verwenden.
  Nach Auswahl: Pill "Du bist **Name**" + Toggle "Nur meine Schichten
  zeigen" (gruppiert dann nach Tag, blendet die Tag-Tabs aus).
- **Tag-Tabs** (sticky beim Scrollen) ersetzen die lange
  Alle-Tage-Scrollliste — `formatDayTabParts()` in `schedule.ts` liefert
  Wochentag/Datum getrennt fürs zweizeilige Tab-Label.
- **Zugewiesene Helfer als Chips**, eigener Name wird an den Anfang
  sortiert und farblich hervorgehoben; ab 4 Helfern eingeklappt mit
  "+N weitere"-Toggle statt endlosem Umbruch.
- **"Deine Schicht"**-Karten: grüner Akzent-Tint (`colors.accentBg`,
  vorberechnete ~10 %-Mischung — das Design nutzt `color-mix()`, das hat
  aber keine native iOS/Android-Entsprechung), dickerer linker Rand,
  Badge oben rechts. Unbesetzte Schichten kriegen stattdessen einen
  roten linken Rand plus Badge.
- **PDF-Export** ist bewusst ein unauffälliger Text-Link im Footer statt
  ein Button — auf dem Handy ein Nebenfeature.
- Layout ist eine auf 430px begrenzte, zentrierte Spalte (`page`-Style) —
  sieht auch auf Desktop-Breite bewusst wie eine schmale
  Handy-optimierte Seite aus, kein separates Desktop-Layout.
- **Ebenen-Falle**: Jede `position:'absolute'`-Overlay-Fläche (Picker-
  Panel, Event-Dropdown) braucht auf ihrem eigenen Eltern-Container ein
  `zIndex`, das höher ist als das aller nachfolgenden Geschwister-Views
  mit eigenem `zIndex` (z. B. die sticky Tag-Tabs-Leiste) — sonst
  rendert das Overlay dahinter statt darüber. In dieser Datei:
  `whoBox`-zIndex muss über dem der `dayTabsBar` liegen.

## Datenzugriff

- `src/shared/data/api.ts` ist die einzige Stelle, die UI-Code für
  Datenzugriffe importieren soll — nie direkt `mockBackend` oder
  `supabaseBackend`.
- Ist `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` gesetzt, geht
  jede Query an Supabase; sonst an den In-Memory-Mock
  (`src/shared/mock/data.ts`, `src/shared/data/mockBackend.ts`). So läuft
  `npm run web` ohne jedes Backend-Setup.
- Datenmodell: siehe `docs/DATENMODELL.md`.

## Struktur

```
src/
  shared/        Typen, Theme, Auth-Context, Daten-Layer, Mock-Seed,
                 Format-Helfer (format/), PDF-Export (print/)
  features/
    admin/        Timeline, Helfer-Pool, Formulare, Drag&Drop, Auth-Gate
    helfer/        Read-only chronologische Liste
  components/     generische UI-Bausteine (Button, Modal, Picker, Header)
supabase/migrations/  SQL-Schema + RLS
design/          Claude-Design-Handoff-Bundle (Referenz, nicht Teil der App)
```

## Setup

```
npm install
cp .env.example .env   # Supabase-URL/Anon-Key eintragen, sonst läuft Mock-Modus
npm run web             # oder: npm run ios / npm run android
```

Supabase-Schema anwenden: alle Dateien in `supabase/migrations/` der Reihe
nach (0001, 0002, 0003, …) gegen das Projekt ausführen (SQL-Editor oder
`supabase db push`).
