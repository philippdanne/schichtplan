# Datenmodell

Quelle: `src/shared/types.ts` (App-seitige Typen), `supabase/migrations/0001_init.sql`
(Postgres-Schema), `src/shared/mock/data.ts` (Seed/Mock, identisch zu den
Supabase-Seed-Daten).

## Entitäten

### Helper

| Feld       | Typ        | Beschreibung                                   |
|------------|------------|-------------------------------------------------|
| id         | uuid       |                                                   |
| name       | text       |                                                   |
| tags       | text[]     | Tätigkeits-Tags, z. B. "Zapfen", "Kellnern"      |
| roleTagId  | uuid ∣ null| Verweis auf `RoleTag` (z. B. Vorstand/Freiw. Helfer) |

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
| ablaufplan | text | Freitext, aktuell nicht in der UI editierbar (Design-Feature, noch nicht portiert — siehe unten) |

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

## Nicht (bzw. noch nicht) übernommene Design-Details

Der Claude-Design-Prototyp (`design/project/Schichtplaner.dc.html`) enthält
über den ursprünglichen Funktionsumfang hinaus noch: Ablaufplan-Editor,
"Spalten verwalten"-Dialog (Tags umbenennen/löschen mit Nutzungsprüfung),
Helfer-Verfügbarkeit pro Tag (ausgegraut im Pool), Drag-to-create direkt im
Kalender, überlappende Schichten als parallele Spuren, und eine native
iOS-Vorschau der Helfer-Ansicht. Das Datenmodell hier ist so angelegt, dass
diese Features inkrementell nachgezogen werden können (z. B. `ablaufplan`
existiert bereits als Spalte, nur ohne UI), wurden aber für den ersten
Durchstich zurückgestellt.
