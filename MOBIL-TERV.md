# V40 Vital mobilalkalmazás – terv és állapot

Döntések (2026-09-18):

- **Az orvos dönt, az app csak megmutatja az adatot.** Ezért az alkalmazás
  *nem* orvostechnikai eszköz, nincs CE-engedélyeztetés.
- **MVP először**, egészségügyi adatok utána.
- **Az orvosi nézet a meglévő webes adminba** kerül, nem külön appba.
- Apple Developer és Google Play fiók rendelkezésre áll.

---

## 1. fázis – MVP (folyamatban)

| Rész | Állapot |
|---|---|
| Token-alapú hitelesítés a backendben | ✅ kész, tesztelve |
| Eszköz-munkamenetek (visszavonható, rotáló) | ✅ kész |
| Expo app váza, navigáció, arculat | ✅ kész |
| Kezelések listája + kategória-szűrő | ✅ kész |
| Foglalási folyamat | ✅ kész |
| Foglalásaim | ✅ kész |
| Bérletek megtekintése | ✅ kész |
| Fiók (szakvélemény, dokumentum, számla) | ✅ kész |
| Futtatás valódi szimulátoron | ⏳ Xcode-licenc kell |
| Bérletvásárlás (Stripe) | ⬜ hátravan |
| Push értesítések | ⬜ hátravan |
| Ikon, indítókép (a weboldal logójából) | ✅ kész |
| Három nyelv + telefonnyelv-felismerés | ✅ kész |
| Store-beadás | ⬜ hátravan |

### Fizetés a store-okban

Az Apple és a Google a **digitális** termékekre kér 15–30% jutalékot. A bérlet
és a foglalás **valós, személyes szolgáltatás**, ami kivétel – így a meglévő
Stripe-integráció használható, jutalék nélkül. A folyamatot viszont úgy kell
felépíteni, hogy megfeleljen a store-szabályoknak.

---

## 2. fázis – Egészségügyi adatok

Valójában **két** integráció, nem három:

| Platform | Megoldás |
|---|---|
| Apple Health | HealthKit |
| Android | **Health Connect** (a Google Fit API megszűnt) |
| Samsung Health | a Health Connectbe ír – nem kell külön SDK |

### Amit előre el kell indítani

Mindkét platformhoz **külön engedélykérés** kell, és a jóváhagyás hetekig tart:

- **Google Play**: Health Apps declaration – meg kell indokolni, milyen
  adattípusokat kérünk és miért.
- **Apple**: a HealthKit-használat indoklása a review során; az adat nem
  használható marketingre, és nem adható tovább.

Ezért érdemes ezt már az MVP store-beadásakor beadni, hogy a 2. fázisra
megvárjuk a jóváhagyást.

### Adatvédelem

Az egészségügyi adat a GDPR 9. cikke szerint **különleges adat**:

- adattípusonként külön, kifejezett hozzájárulás, bármikor visszavonható,
- adatvédelmi hatásvizsgálat (DPIA) kell,
- EU-s tárolás, titkosítás, hozzáférés csak a **hozzárendelt** orvosnak,
- minden hozzáférés naplózva (az `AuditLog` már ezt a mintát követi).

---

## 3. fázis – Későbbi bővítések

- Kérdőívek kitöltése az appban (a `QuestionnaireResponse` modell már megvan).
- Lelet-feltöltés a telefon kamerájával.
- Bérlet-emlékeztető a lejárat előtt.
- Widget / Apple Wallet-kártya a következő időpontról.

---

## Nyitott kérdések

1. **Ikonok és arculat**: van-e az appra szánt grafikai anyag, vagy a webes
   arculatból származtassuk?
2. **Nyelvek**: az MVP induljon csak magyarul, vagy már három nyelven?
3. **Az orvosi nézet** pontos tartalma: milyen Health-adatokat lásson az orvos,
   és milyen bontásban (napi, heti trend, riasztási küszöb)?
