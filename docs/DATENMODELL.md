# Datenmodell

Quelle: `src/shared/types.ts` (App-seitige Typen), `supabase/migrations/*.sql`
(Postgres-Schema, chronologisch: `0001_init.sql`, `0002_day_settings.sql`,
`0003_helper_availability.sql`), `src/shared/mock/data.ts` (Seed/Mock,
identisch zu den Supabase-Seed-Daten).

## Entitäten

### Helper

| Feld       | Typ        | Beschreibung                                   |
|------------|------------|-------------------------------------------------|
| id         | uuid       |                                                   |
| name       | text       |                                                   |
| tags       | text[]     | Tätigkeits-Tags, z. B. "Zapfen", "Kellnern"      |
| roleTagId  | uuid ∣ null| Verweis auf `RoleTag` (z. B. Vorstand/Freiw. Helfer) |
| availability | text[] ∣ null | Tage, an denen der Helfer verfügbar ist, als `"eventId:date"`-Keys. `null` = immer verfügbar. Spalte via `0003_helper_availability.sql`. |

### RoleTag

| Feld  | Typ  | Beschreibung                    |
|-------|------|----------------------------------|
| id    | uuid |                                   |
| name  | text | z. B. "Vorstand", "Freiw. Helfer"|
| color | text | Hex-Farbe für die Badge           |

### EventSummary (Event)

| Feld       | Typ  | Beschreibung          |
|------------|------|------------------------|
| id         | uuid |                         |
| name       | text | z. B. "Schützenfest"   |
| startDate  | date |                         |
| endDate    | date |                         |
| ablaufplan | text | Freitext, editierbar über den "Ablaufplan"-Button/Modal im Admin-Toolbar |

### EventTag

Die pro Event konfigurierbaren "Spalten" im Admin-Zeitstrahl (Zapfen/Kellnern/
Wertmarkenverkauf sind nur die Default-Tags für neue Events, keine globale
Konstante).

| Feld      | Typ  |
|-----------|------|
| id        | uuid |
| eventId   | uuid |
| name      | text |
| sortOrder | int  |

### EventDaySettings (nur Datenbank, kein eigener App-Typ)

`event_day_settings(event_id, date, day_start, day_end)` — pro Event und
Kalendertag der sichtbare Zeitstrahl-Bereich ("Tag von/bis" im
Admin-Toolbar). Ohne Eintrag gilt der Default `10:00`–`00:00`
(`src/shared/data/api.ts` → `getDaySettings`). `day_end <= day_start` wird
als "über Mitternacht" interpretiert (z. B. `day_start=22:00`,
`day_end=02:00` → Zeitstrahl zeigt 22:00–02:00 des Folgetags). Das ändert
nichts an `Shift.startTime`/`endTime` selbst — Schichten bleiben weiterhin
auf einen einzelnen Kalendertag beschränkt (siehe Einschränkung unten).

### Shift

| Feld              | Typ       | Beschreibung                          |
|-------------------|-----------|-----------------------------------------|
| id                | uuid      |                                          |
| eventId           | uuid      |                                          |
| tagId             | uuid      | Verweis auf `EventTag` (Spalte)          |
| name              | text      |                                          |
| description       | text      |                                          |
| startTime         | timestamptz (ISO) | absolute Start-Zeit             |
| endTime           | timestamptz (ISO) | absolute End-Zeit               |
| assignedHelperIds | uuid[]    | abgeleitet aus `shift_assignments`       |

Bewusste Abweichung vom ursprünglich skizzierten Minimalmodell
(`Shift(id, name, description, startTime, endTime, assignedHelperIds)`):
`eventId`/`tagId` wurden ergänzt, weil das Design mehrere Events mit
konfigurierbaren Spalten vorsieht — ohne Event-/Spalten-Zuordnung ließe sich
die Timeline-Ansicht nicht abbilden.

### ShiftAssignment (nur Datenbank, kein App-Typ)

Join-Tabelle `shift_assignments(shift_id, helper_id)` — many-to-many zwischen
Shift und Helper. In der App als `Shift.assignedHelperIds` abgebildet.

## Auth & Zugriff

- **Helfer-Ansicht:** kein Login, nur lesend. RLS erlaubt `select` für alle
  (auch `anon`) auf allen Tabellen.
- **Admin-Bereich:** erfordert eine Supabase-Auth-Session (E-Mail/Passwort).
  RLS erlaubt `insert`/`update`/`delete` nur für `authenticated`-Sessions.
  Es gibt keine granulareren Rollen — jede eingeloggte Person kann alles im
  Admin-Bereich.

## Bekannte Einschränkung: Schichten bleiben auf einen Kalendertag beschränkt

`Shift.startTime`/`endTime` liegen beide auf demselben Datum (siehe
`ShiftFormModal.tsx`, das Formular verlangt `start < end` als reine
Uhrzeiten). Der Zeitstrahl selbst kann dank `EventDaySettings` zwar über
Mitternacht hinaus angezeigt werden (z. B. für einen Tag, der bis 02:00
läuft), aber eine einzelne Schicht kann nicht von 23:00 bis 01:00
durchgehen. Drag-to-create klemmt entsprechend am Tagesende (23:59). Für
echte Übernacht-Schichten bräuchte es zusätzlich getrennte Datums- und
Uhrzeit-Felder im Formular plus eine Lockerung der `shifts_time_order`-Check
in der DB — bewusst zurückgestellt, da im bisherigen Anwendungsfall
(Schützenfeste) keine Schicht über Mitternacht vorkommt.

## Nicht übernommene Design-Details

Einzig die native iOS-Vorschau (`design/project/ios-frame.jsx`, "Mobile
Vorschau"-Button im Prototyp) wurde bewusst nicht portiert — das war ein
Hilfsmittel zum Prototyping innerhalb von Claude Design, kein Feature der
Ziel-App, die ja bereits nativ auf iOS/Android läuft (Expo). Alle anderen
Design-Features (Ablaufplan-Editor, Spalten verwalten, Helfer-Verfügbarkeit,
Drag-to-create, überlappende Schichten als parallele Spuren, neue Rollen-Tags
mit Farbauswahl) sind umgesetzt.
