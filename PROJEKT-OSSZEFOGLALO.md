# V40 Vital – digitális platform: hol tartunk, mi jön, mikor élesedünk

*Belső összefoglaló a tulajdonosi körnek. Készült: 2026. szeptember 18.*

---

## 1. Egy mondatban

A weboldal helyén ma egy teljes értékű rendelőrendszer áll (foglalás, fizetés,
számlázás, bérletek, páciens-dokumentáció, három nyelv), és elkészült hozzá az
iOS és Android alkalmazás is, amely a páciens Apple Health / Health Connect
adatait az orvos elé viszi. **A rendszer működik, de még nem éles.**

---

## 2. Mi készült el

| Terület | Állapot |
|---|---|
| Foglalási motor (szabad idősáv, szoba- és szakemberkapacitás, versenyhelyzet-védelem) | Kész, automata tesztekkel |
| Online fizetés, kártya-biztosíték, no-show terhelés, visszatérítés | Kész (éles kulcs kell) |
| Számlázás + NAV beküldés, sztornó, PDF | Kész (éles kulcs kell) |
| Bérletek: vásárlás, levonás, lejárat | Kész |
| Admin: foglalások, számlák, bérletek, páciensek, orvosok, szövegek, fordítások | Kész |
| Orvos szerepkör, páciens-hozzárendelés, szakvélemény, dokumentumfeltöltés | Kész |
| Három nyelv (HU/EN/DE) a teljes ügyféloldalon és az e-mailekben | Kész |
| Mobilalkalmazás: foglalás, bérletek, fiók, nyelvváltás | Kész |
| Egészségügyi adatok: Apple Health és Health Connect beolvasás | Kész |
| Orvosi nézet: trendek, kezelés előtti/utáni összehasonlítás | Kész |

**Ami ebből ma is megnézhető:** a tesztrendszer és mindkét alkalmazás
tesztverziója (iOS TestFlight, Android APK).

---

## 3. Mi hiányzik az élesedéshez

### 3.1 Technikai (a mi dolgunk)

| Feladat | Becsült ráfordítás |
|---|---|
| Appon belüli bérletvásárlás és fizetés | 1 hét |
| Push értesítések (emlékeztető, visszaigazolás) | 3–4 nap |
| Éles szerver beállítása, adatátköltöztetés, HTTPS | 3–4 nap |
| Tesztelés valós pácienseken (5–10 fő), hibajavítás | 2 hét |
| Store-beadás, kiadási anyagok (képernyőképek, leírás) | 3–4 nap |

### 3.2 Amihez külső kulcs vagy szerződés kell (nem fejlesztés)

- **Stripe** éles fiók – kártyás fizetéshez
- **Számlázz.hu** Számla Agent kulcs – számlázás és NAV-beküldés
- **SMTP** szolgáltató – visszaigazoló és emlékeztető e-mailek
- **Twilio** (opcionális) – SMS emlékeztető

Ezek beállítása fejenként néhány óra, de a **szerződéskötés napokat-heteket**
vihet. Érdemes most elindítani.

### 3.3 Amit a hatóságok és a store-ok szabnak meg — ez határozza meg az ütemet

Ezek nem fejlesztési feladatok, és **nem gyorsíthatók pénzzel**:

| Tétel | Átfutás | Mikor kell indítani |
|---|---|---|
| Apple App Store – első kiadás review | 1–3 nap | store-beadáskor |
| Google Play – első kiadás | 1–7 nap | store-beadáskor |
| **Apple HealthKit indoklás** | a review része, elutasítás esetén újrakör | azonnal |
| **Google Play egészségügyi adat nyilatkozat** | **2–6 hét** | **azonnal** |
| **Adatvédelmi hatásvizsgálat (DPIA)** | 2–4 hét (jogásszal) | azonnal |

> **A Google egészségügyi nyilatkozata a leghosszabb tétel az egész projektben.**
> Ha ma elindítjuk, nem ez lesz a szűk keresztmetszet. Ha a fejlesztés végén,
> akkor 4–6 hetet veszítünk.

---

## 4. Ütemezés

Az alábbi terv abból indul ki, hogy **a külső kulcsok és a hatósági beadványok
most elindulnak**.

| Szakasz | Mikor | Mi történik |
|---|---|---|
| **0. Előkészítés** | szept. 22 – okt. 16 | Hátralévő fejlesztés (appon belüli fizetés, push). **Párhuzamosan: a Google egészségügyi nyilatkozat beadása, a Stripe és Számlázz.hu szerződések, a DPIA indítása.** |
| **1. Belső teszt** | okt. 19 – okt. 30 | A csapat végigpróbálja a foglalást, fizetést, számlázást a tesztrendszerben. Hibajavítás. |
| **2. Éles weboldal** | **nov. 2.** | A honlap élesedik a valódi foglalással. Az app még nem. |
| **3. Zárt app-teszt** | nov. 2 – nov. 20 | 5–10 valódi páciens TestFlighten és Androidon. Itt derülnek ki a valós használati hibák. |
| **4. Store-beadás** | nov. 23. | A javított verzió beadása mindkét store-ba. |
| **5. GO LIVE – app** | **dec. 5.** | Nyilvános megjelenés mindkét platformon. |
| **6. Egészségügyi modul élesítése** | **jan. 12.** | Csak ha a Google nyilatkozat addigra megvan. |

**Go live az éles weboldallal: november 2.**
**Go live az alkalmazásokkal: december 5.**

### Miért december 5. és nem december 20.

Az Apple minden évben bejelent egy **ünnepi időszakot** (jellemzően december
20-tól az év végéig), amikor a kiadások feldolgozása **szünetel vagy erősen
lelassul**. Aki abba a sávba ad be, januárig várhat.

Ezért van a store-beadás november 23-án: így marad **két hét ráhagyás** egy
esetleges elutasításra, és a megjelenés még bőven az ünnepi leállás előtt van.

### Miért januárban az egészségügyi modul

Az eredeti terv szerint ez két héttel az app után jött volna – az mostani
eltolással **december 19-re esne, vagyis pont az ünnepi leállásba**. Egy
egészségügyi adatokat kezelő modult a leállás előtti napokban kiadni rossz
ötlet: ha elutasítják, három hétig nincs javítási lehetőség.

**Január 12. a biztonságos dátum.** Ha a Google nyilatkozat hamarabb megvan és
a zárt teszt jól megy, december 15-re is előrehozható – de ezt csak akkor
érdemes, ha minden zöld.

A 6. szakasz dátuma egyébként is a legbizonytalanabb, mert nem rajtunk múlik.
Ezért van külön: **az app nem várja meg** – az egészségügyi fül bekapcsolható
később, appfrissítéssel.

---

## 5. Mitől lesz ez valódi Longevity termék, nem foglalórendszer

Ma a rendszer a *kezelés megvásárlását* támogatja. A longevity ígérete viszont
nem egy kezelés, hanem egy **követett folyamat**. Az alábbiak erre épülnek – és
egyben ezek adják a fizetős szolgáltatás alapját.

### 5.1 Kiindulási állapot és újramérés

A páciens belép a programba, felmérés készül (Longevity Scan, CardioMérleg,
labor, mikrobiom). Az app **rögzíti a kiindulási értékeket**, és a következő
vizsgálatnál összeveti őket.

*Ma:* a kezelés előtti/utáni összehasonlítás már működik a napi mért adatokra.
*Ami hiányzik:* a laboreredmények és a vizsgálati leletek strukturált
bevitele, hogy azok is összevethetők legyenek.

### 5.2 Kezelés eredményének visszamérése

Minden infúzió, program, kezelés után automatikusan megnézhető, mi változott a
következő 2–4 hétben: alvás, nyugalmi pulzus, HRV, testösszetétel.

*Ma:* ez a funkció kész, az orvos felületén.
*Ami hiányzik:* a páciensnek is meg kell mutatni – érthetően, nem nyers
grafikonként.

### 5.3 Orvosi kiértékelés

Az orvos a mért adatok alapján írja meg a szakvéleményt és a következő lépést.
A páciens ezt az appban kapja meg, nem e-mailben elveszve.

*Ma:* a szakvélemény-írás és -kézbesítés kész.
*Ami hiányzik:* sablonok, hogy az orvosnak 5 perc legyen, ne 30.

### 5.4 Online orvosi tanácsadás

Videós vagy írásos konzultáció az appból.

> **Figyelem:** a telemedicina Magyarországon **engedélyköteles egészségügyi
> tevékenység**. Nem elég a szoftver: a szolgáltatási engedélyt ki kell
> terjeszteni rá, és a betegdokumentációs előírások is vonatkoznak rá. Ez
> jogi/engedélyezési feladat, nem fejlesztési – érdemes most megkérdezni az
> egészségügyi jogászt, mert a válasz befolyásolja az ütemtervet.

### 5.5 Amit érdemes megfontolni

- **Napi „longevity pontszám"** – egyetlen szám, ami mögött az alvás, mozgás,
  pulzusvariabilitás áll. Ez az, amiért a páciens naponta megnyitja az appot.
- **Kezelés-emlékeztető és felkészítő** – „holnap infúzió, ma igyál sokat".
- **Bérlet lejárati figyelmeztetés** – közvetlen bevételi hatás.
- **Program-útvonal** – a páciens látja, hol tart a 6 hónapos programban.
- **Családi fiók** – házaspárok együtt vásárolnak programot.

> **Egy határ, amit tudatosan tartunk:** az app **nem** ad diagnózist és nem
> javasol kezelést magától. Ha algoritmus mondaná meg, mit tegyen a páciens, a
> szoftver az EU szabályozása szerint **orvostechnikai eszközzé** válna
> (MDR, Rule 11) – ez bejelentett szervezetet, klinikai értékelést és
> CE-jelölést jelentene, jellemzően **1–2 év és nagyságrendekkel nagyobb
> költség**. Amíg az orvos dönt és az app csak megmutatja az adatot, ez nem
> áll fenn. Ez a legfontosabb termékhatár, amit meg kell tartanunk.

---

## 6. Hogyan lesz ebből bevétel

### 6.1 Ami már ma bevételt hoz

- kezelések online foglalása és fizetése
- bérletek értékesítése
- no-show díj (ma elmaradó bevétel)

### 6.2 Fizetős digitális szolgáltatás – javaslat

**„V40 Longevity Program" – havi díjas tagság**

| Szint | Tartalom | Irányár |
|---|---|---|
| Alap (ingyenes) | Foglalás, bérlet, számlák, saját adatok | 0 Ft |
| **Követés** | Health-adat szinkron, trendek, kezelés-visszamérés, negyedéves orvosi kiértékelés | 9–15 000 Ft/hó |
| **Prémium** | + online konzultáció, személyre szabott program, soron kívüli időpont | 25–40 000 Ft/hó |

A logika: a **kezelés** az egyszeri bevétel, a **követés** a visszatérő. Egy
longevity páciens értéke nem egy infúzió, hanem egy több éves kapcsolat.

### 6.3 Egy kereskedelmi részlet, ami sokat számít

Az Apple és a Google a **digitális** szolgáltatásokra **15–30% jutalékot** kér.

- A **kezelés és a bérlet** valós, személyes szolgáltatás → **kivétel**, saját
  fizetési megoldással, jutalék nélkül.
- A **havi digitális tagság** viszont **nem kivétel** → ha az appban adjuk el,
  a bevétel 15–30%-a a store-é.

**Ezért:** a tagságot érdemes a **weboldalon** értékesíteni, az app pedig
hozzáférést ad hozzá. Ez bevett és szabályos megoldás, de a folyamatot előre
így kell felépíteni – utólag átalakítani drága.

---

## 7. Amiről dönteni kell

1. **Mikor legyen az éles weboldal indulása?** A javaslat október 6.
2. **Indítsuk-e most a Google egészségügyi nyilatkozatot?** Ha nem most, az
   egészségügyi modul csúszik.
3. **Akarunk-e online orvosi tanácsadást?** Ha igen, az engedélyeztetést most
   kell elindítani.
4. **Havi díjas tagság: igen vagy nem?** Ha igen, a fizetési folyamatot a
   weboldalra kell tervezni, nem az appba.
5. **Ki az orvosi felelős** a szakvéleményekért és a kiértékelésekért?

---

## 8. Kockázatok

| Kockázat | Hatás | Kezelés |
|---|---|---|
| Google egészségügyi nyilatkozat elhúzódik | Az egészségügyi modul csúszik | Most elindítani; az app nem várja meg |
| Store elutasítja az első beadást | 1–2 hét | Nem az utolsó pillanatban adjuk be |
| Telemedicina engedély hiánya | A tanácsadás nem indulhat | Jogi egyeztetés most |
| Éles fizetési kulcsok késnek | Nincs online fizetés induláskor | A helyszíni fizetés működik, indulhatunk vele |
| Kevés páciens szinkronizál adatot | A longevity ígéret üres marad | Az első felmérésen közösen állítsuk be |

---

## 9. Következő lépés

A fenti 5 döntéshez kérek visszajelzést. Amint megvannak, a dátumok
véglegesíthetők, és a külső beadványokat elindítjuk.
