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

## Auth — WICHTIG, Stand aktualisiert

Frühere Projektstände sahen **bewusst keine Authentifizierung** vor. Das hat
sich geändert:

- **Admin-Bereich** (Events/Schichten anlegen, Helfer zuweisen, Helfer
  anlegen) **erfordert jetzt eine Supabase-Auth-Session**. Siehe
  `src/features/admin/AdminGate.tsx`.
- **Helfer-Ansicht bleibt ohne Login** — rein lesend, kein Auth-Check, per
  Design-Vorgabe.
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
  shared/        Typen, Theme, Auth-Context, Daten-Layer, Mock-Seed
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
