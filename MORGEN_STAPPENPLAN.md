# Morgen stappenplan — ELKO App v1

Dit is wat je morgen moet doen. Geen technische diepgang; gewoon de route.

## 1. Upload hier in ChatGPT

Upload bij voorkeur:

1. 2 of 3 bestaande offertes als PDF of foto
2. het logo dat je echt wilt gebruiken
3. eventueel een factuurvoorbeeld
4. eventueel algemene voorwaarden of standaard betaaltekst

Daarmee kunnen we de offerte/PDF visueel en tekstueel beter maken.

## 2. Maak accounts aan

Je hebt uiteindelijk drie accounts nodig:

1. GitHub — code bewaren
2. Supabase — database, login en foto-opslag
3. Vercel — app online zetten

De GitHub app op je telefoon is handig voor meekijken, maar uploaden en deployen gaat makkelijker via browser/laptop/iPad.

## 3. GitHub repository maken

Maak een repository met naam:

elko-app-v1

Zet hem voorlopig privé.

Upload de bestanden uit de ZIP naar GitHub.

## 4. Supabase instellen

Maak een nieuw Supabase project aan.

Voer daarna uit:

1. supabase/schema.sql
2. supabase/seed.sql

Maak daarna een Storage bucket aan:

project-photos

## 5. Vercel koppelen

Importeer je GitHub repository in Vercel.

Vul deze environment variables in:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_NAME

Daarna deployt Vercel de app.

## 6. Testen

Test met project:

Elmer Terlingen — Horren op maat IJsselstein

Doel:

- klant aanmaken
- project aanmaken
- productregels toevoegen
- totaal €625
- offerte-preview maken
- PDF downloaden
- afspraak toevoegen
- agenda-export downloaden

## 7. iPhone gebruik

Als de app online staat:

1. Open de app in Safari
2. Tik op delen
3. Kies Zet op beginscherm
4. Daarna voelt het als een app

Dit is nog geen App Store-app, maar voor intern gebruik is dit de beste start.

## 8. Wat daarna komt

Na de eerste test bouwen we verder:

1. mooiere PDF-opmaak met logo
2. offerte-/factuurnummering
3. facturen
4. montagebon
5. echte Apple/Microsoft agenda-koppeling
6. rollen voor monteurs
7. klantportaal
