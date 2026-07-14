# ELKO App v1 — startcode

Interne webapp / PWA voor ELKO Solutions / Fly Horren.

## App v1 scope

- Klant aanmaken
- Project aanmaken
- Productregels toevoegen
- Maten en uitvoering invullen
- Foto's toevoegen
- Richtprijs tonen
- Prijs handmatig aanpassen
- Totaal automatisch optellen
- Offerte-preview genereren
- Offerte opslaan
- Later: PDF-offerte downloaden

## Techniek

- Next.js / React
- TypeScript
- Supabase Database
- Supabase Auth
- Supabase Storage
- CSS zonder externe UI-library

## Installatie

Maak eerst een Supabase-project aan en voer de SQL uit:

1. Open Supabase SQL Editor
2. Plak `supabase/schema.sql`
3. Voer daarna `supabase/seed.sql` uit
4. Maak een Storage bucket aan met naam: `project-photos`

Daarna lokaal:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Vul `.env.local` met je Supabase gegevens.

## Eerste testproject

Gebruik deze test:

- Klant: Elmer Terlingen
- Project: Horren op maat IJsselstein
- Raamhor kamer oudste: €150
- Raamhor kamer jongste: €150
- Enkele plissé hordeur tuin: €300
- Raamuitzetter vervangen: €25
- Totaal: €625


## Nieuwe onderdelen in uitgebreide versie

Deze uitgebreide versie bevat extra:

- PDF-download voor offerte via `/api/quote-pdf`
- Planning / afsprakenmodule
- Agenda-export via .ics voor Apple Agenda en Outlook
- PWA manifest voor iPhone beginscherm
- business_settings tabel
- morgen-stappenplan
- instructie voor offertes en logo uploaden

## Belangrijke route

- `/appointments` — planning bekijken
- `/projects/[id]/appointments/new` — afspraak maken vanuit project
- `/projects/[id]/quote` — offerte-preview, opslaan en PDF downloaden
