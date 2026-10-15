# Imposter Party Hub

Vytvor webovú aplikáciu na párty hru „Imposter“.



Cieľ aplikácie:

Používatelia si v partii zahrajú hru, kde všetci hráči okrem jedného uvidia tajné slovo. Jeden hráč je imposter a namiesto slova uvidí iba text „IMPOSTER“. Hráči následne podľa pravidiel hry hádajú, kto je imposter.



Funkcionalita:



Vytvorenie roomky



Jeden používateľ vytvorí novú roomku.

Pri vytvorení sa automaticky vygeneruje unikátny kód roomky.

Room creator bude admin danej roomky.

Môže existovať neobmedzené množstvo roomiek.

Pri novej hre s inou partiou sa dá vytvoriť nová roomka.



Pripojenie do roomky



Ostatní hráči sa pripoja zadaním kódu roomky.

Každý hráč si musí pred vstupom zadať svoj nickname.

Po pripojení sú všetci hráči v spoločnom workspace/lobby.

V lobby sa zobrazuje zoznam hráčov.



Spustenie hry



Admin/room creator môže spustiť nové kolo.

Aplikácia náhodne vyberie jedného hráča, ktorý zadá tajné slovo pre dané kolo.

Tento hráč nesmie byť automaticky imposter.

Po zadaní slova aplikácia náhodne vyberie jedného impostera zo všetkých hráčov.

Každému hráčovi sa zobrazí jeho vlastná karta:

bežní hráči uvidia tajné slovo,

imposter uvidí iba text „IMPOSTER“.

Každý hráč vidí iba svoju kartu, nie kartu ostatných.



Priebeh kola



Po odhalení kariet môže skupina hrať offline podľa vlastných pravidiel.

Admin má možnosť ukončiť kolo.

Po ukončení kola room admin zapise score hráčom

Po zapísaní score sa môže spustiť ďalšie kolo s novým slovom a novým imposterom.



Score a leaderboard



Room creator/admin môže manuálne zapisovať skóre hráčom.

Pri každom hráčovi bude možné pridať alebo odobrať body.

V aplikácii bude samostatný tab „Leaderboard“.

Leaderboard zoradí hráčov podľa skóre od najvyššieho po najnižšie.

Skóre sa ukladá v rámci konkrétnej roomky.



Štruktúra aplikácie



Onboarding screen

pole na zadanie nickname

onboarding copy ako funguje hra

Home screen:

tlačidlo „Create room“

pole „Enter room code“

Lobby/workspace:

kód roomky

zoznam hráčov

tlačidlo na spustenie kola pre admina

Game screen:

karta hráča so slovom alebo textom „IMPOSTER“

výrazné tlačidlo na skrytie/odhalenie karty

admin ovládanie na ukončenie kola

Po ukončení kola

zoznam hráčov

plus/mínus body

Leaderboard tab:

zoradenie hráčov podľa skóre



Dizajn:



Použi playful neobrutalism štýl.

Výrazné farby, hrubé čierne okraje, veľké tlačidlá, výrazná typografia.

Appka má pôsobiť zábavne, hravo a párty-friendly.

Mobile-first dizajn, aby sa dala pohodlne používať na telefóne počas hry.

UI má byť jednoduché, rýchle a zrozumiteľné aj pre ľudí, ktorí aplikáciu vidia prvýkrát.



Technické požiadavky:



Dáta roomiek, hráčov, skóre a aktuálneho kola ukladaj tak, aby fungovalo viacero roomiek paralelne.

Kód roomky musí byť krátky a ľahko zdieľateľný, napríklad 4–6 znakov.

Zabráň tomu, aby hráč bez nickname vstúpil do roomky.

Ošetri neexistujúci alebo nesprávny room code.

Ošetri stav, keď v roomke nie je dosť hráčov na začatie hry.

Aplikácia by mala fungovať realtime alebo aspoň tak, aby všetci hráči videli aktuálny stav roomky bez manuálneho refreshovania.

Appka sa bude volať Zuzposter

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zuzposter.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a2017a9d-6565-4e20-b202-51521a5d697a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
