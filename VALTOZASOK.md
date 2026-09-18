# V40 Vital – Újdonságok az eredeti oldalhoz képest

Az eredeti oldal lényegében egy **statikus bemutatkozó weboldal** volt: külső
**Swazy foglalási widget**, csak magyar nyelven, minimális adminnal, valódi
fizetés/számlázás/pácienskezelés nélkül. Az alábbiak épültek rá.

---

## 1. Valódi foglalási rendszer (a Swazy widget helyett)
- Saját, 3 lépéses foglalási folyamat: **szakember → nap → időpont → adatok → megerősítés**.
- A szabad időpontokat a szerver számolja (szakember + szoba kapacitás, pufferidők).
- **Versenyhelyzet-védelem**: ugyanarra az időpontra egyszerre kattintókból pontosan egy foglalhat (tranzakciós zárolás + adatbázis-szintű egyedi kulcs).
- Vendégként és regisztrált ügyfélként is foglalható; a foglalásból automatikusan fiók jön létre.
- Lemondás az ügyfél fiókjából; bérletes alkalom visszaírása.

## 2. Online fizetés (Stripe)
- **Bankkártyás fizetés** a foglaláskor, **Apple Pay / Google Pay** támogatással.
- **Kártya-biztosíték**: helyszíni fizetésnél a kártyát biztosítékként rögzítjük (nem terheljük), no-show / késői lemondás esetére.
- **No-show terhelés** adminból (a beállított díj-százalék szerint).
- **Visszatérítés** adminból (foglalásra és bérletre is).
- Kulcsok nélkül „mock" módban fut, így valós fizetés nélkül is tesztelhető.

## 3. Számlázás + NAV Online Számla
- Automatikus **számlakiállítás** fizetéskor **Számlázz.hu**-n keresztül, ami a **NAV Online Számla** beküldést is elvégzi.
- **Sztornó** számla visszatérítéskor.
- **Számla-PDF** letölthető (ügyfél fiókjában és adminban).
- Az ügyfél e-mailben is megkapja a számlát.

## 4. Bérletek
- **Online bérlet-vásárlás** kártyás fizetéssel (számlával együtt).
- A sikeres fizetés automatikusan aktiválja a bérletet (alkalmak, érvényesség).
- **Admin**: eladott bérletek listája + visszatérítés.

## 5. Értesítések (e-mail + SMS)
- **E-mail**: foglalás-visszaigazolás, emlékeztető (1 nappal előtte + aznap reggel), vásárlás/számla, visszatérítés, szakvélemény.
- **SMS emlékeztető** (Twilio) – bekapcsolható.
- Az **e-mail (SMTP)** és az **SMS** beállításai **adminból** megadhatók.

## 6. Jogosultságkezelés + páciens-menedzsment
- Új **orvos (DOCTOR) szerep**: csak szakvéleményt ír a hozzárendelt pácienseinek, mást nem lát.
- **Admin felhasználó-kezelés**: ügyfél és orvos felvitele, **aktiválás/deaktiválás**, adatlap **foglalás/kezelés-történettel**.
- **Orvos–páciens hozzárendelés**; a hozzárendelt orvos látja a páciens előzményeit.
- **Páciens dokumentum-feltöltés** a saját fiókjában (lelet, PDF/kép), amit a hozzárendelt orvos és a staff lát – nem publikus, jogosultsággal védett tárolás.

## 7. Szakvélemény / dokumentáció
- A staff/orvos **szakvéleményt** ír a pácienshez.
- **Kódolt dokumentum** (a kód a páciens születési évéből + a dokumentum dátumából áll).
- Megjelenik a páciens **fiókjában** és **e-mailben is kimegy PDF-ként**.
- (Ezért kérünk a **regisztrációnál születési dátumot** is.)

## 8. Háromnyelvűség (HU / EN / DE)
- A **teljes ügyféloldal** lefordítva: nyitóoldal, kezelések, GYIK, kapcsolat, rólunk, longevity, navigátor **és a tranzakciós oldalak** (foglalás, fiók, be-/regisztráció, fizetési felületek).
- Az **adatbázis-tartalom** is fordítható (kezelések, típusok, orvosok, bérletek).
- **Nyelvváltó** a fejlécben; a nyelv a teljes oldalon és e-mailekben érvényes.
- Új nyelv felvitelekor **AI-fordítás** (ha van hozzá kulcs).

## 9. Modern, bővített admin felület
- Belépés közvetlenül a **/admin** címen (nincs külön /login).
- **Vezérlőpult**, **Foglalások** (terhelés/visszatérítés), **Eladott bérletek**, **Számlák** (NAV-státusz, sztornó, PDF), **Felhasználók**, **Szakvélemények**.
- **Kezeléstípusok CRUD** (ikonnal, rövid + részletes leírással) – a nyitóoldali „Kezeléseink" lista innen épül.
- **Szövegek** szerkesztő (kereső + oldal-szűrő + nyelvváltó) és **Fordítások** szerkesztő az adatbázis-tartalomhoz.
- **Beállítások**: fizetés (online ki/be, no-show díj %, pénznem), számlázás, SMTP, SMS, marketing (GA4/GTM/Pixel), foglalási szabályok.
- **Kép- és dokumentumfeltöltés**, szakemberekhez fotó.

## 10. Ügyfélfiók
- Foglalások (közelgő/korábbi), **bérletek**, **szakvélemények**, **feltöltött dokumentumok**, **számlák** – mind letölthető/kezelhető egy helyen.

## 11. Üzemeltetés / technika
- **Adatmodell** foglaláshoz, fizetéshez, számlázáshoz, bérlethez, páciens-dokumentációhoz (Prisma + MySQL, verziózott migrációkkal).
- **Idempotens e-mail/SMS** (nem megy ki kétszer), **audit napló** a pénzügyi és jogosultsági műveletekről.
- **Ütemezett feladatok** (emlékeztetők, lejárt foglalás-zárolások felszabadítása).
- **Automata tesztek** és teljes **típusellenőrzés**.
- **DEPLOY.md** telepítési útmutató külső szerverre.

---

### Amihez éles kulcsok kellenek (nem kód – utólag is beállítható adminból/.env-ben)
Stripe (fizetés), Számlázz.hu (számla+NAV), SMTP (e-mail), Twilio (SMS).
Ezek nélkül a rendszer működik, csak az adott funkció „mock" (teszt) módban fut.
