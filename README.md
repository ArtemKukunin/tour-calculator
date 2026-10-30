# Kalkulator wycieczek / Калькулятор турів

Jedna strona, dwa widoki:

- **Strona dla klientów** — trasa, dni, program, cena za osobę (UA / PL / EN).
- **Kalkulator** (`#kalkulator`) — tylko dla zaproszonych kont z prawem edycji: transport (autokar z km, spalaniem i ceną paliwa, samolot, prom, taxi…), personel, hotele, wyżywienie i wycieczki na każdy dzień, liczba turystów, marża, rezerwa na inflację. Wiele wycieczek, wersje robocze, publikacja tylko wybranych.

Koszty są w prywatnej bazie artefaktu (reguła `private`: odczyt i zapis tylko dla edytorów). Do strony klienta trafiają wyłącznie dane z `buildPublic()`.

## Struktura

```
src/core.js            obliczenia (calc, buildPublic) — bez DOM, testowane w Node
src/page.html          szablon strony: style, widok klienta, kalkulator, logowanie
src/skeleton-head.txt  nagłówek dokumentu wymagany przy samopublikacji strony
data/example-trip.json przykładowa wycieczka (trasa z PDF, ceny przykładowe)
data/published.json    aktualnie opublikowane dane klienta
build.py               składa dist/index.html
test_core.js           testy obliczeń
```

## Uruchomienie

```
node test_core.js
python3 build.py      # -> dist/index.html
```

Strona działa jako artefakt Claude (zapis w bazie, publikacja, logowanie przez konto Claude). Otwarta lokalnie pokazuje tylko widok klienta.
