# V40 Vital – Telepítési útmutató (külső szerverre)

Ez az útmutató végigvezet a V40 Vital alkalmazás éles (production) telepítésén.
Az alkalmazás **Nuxt 4 (Node szerver) + Prisma + MySQL** alapú.

---

## 1. Követelmények

| Komponens | Verzió | Megjegyzés |
|-----------|--------|-----------|
| Node.js   | **20 LTS vagy 22 LTS** | (fejlesztés 24-en is megy) |
| MySQL     | **8.x** | vagy MariaDB 10.6+ |
| Reverse proxy | nginx / Caddy | HTTPS-terminálás |
| Folyamatkezelő | pm2 vagy systemd | a Node-folyamat futtatásához |

A szerveren kell **kimenő 443** (Stripe, Számlázz.hu, SMTP, Twilio API-k) és
egy futó MySQL adatbázis.

---

## 2. Fájlok a szerverre

A teljes forráskód kell (a `node_modules`, `.nuxt`, `.output`, `.env` és a
`storage/` **nélkül** – ezeket a szerveren állítod elő). A mellékelt
`v40-vital-forras.tar.gz` pontosan ezt tartalmazza.

```bash
mkdir -p /var/www/v40 && cd /var/www/v40
tar xzf v40-vital-forras.tar.gz
```

---

## 3. Környezeti változók (`.env`)

Másold a mintát és töltsd ki:

```bash
cp .env.example .env
```

Kötelező mezők:

```dotenv
# Adatbázis
DATABASE_URL="mysql://FELHASZNALO:JELSZO@localhost:3306/v40"

# Munkamenet-titok (min. 32 karakter):  openssl rand -base64 32
# FONTOS: éles környezetben EGYEDI, a fejlesztőitől ELTÉRŐ értéket adj meg, és
# tartsd titokban. Ha ezt megváltoztatod (vagy először állítod be élesen),
# MINDEN korábbi bejelentkezés azonnal érvénytelenné válik – a felhasználók
# (és te is) kijelentkeztek, újra be kell lépni. Ezzel szüntethető meg a
# "telepítés után véletlenül be voltam lépve" helyzet is.
NUXT_SESSION_PASSWORD="<legalább-32-karakter>"

# Az első admin (a seed hozza létre)
ADMIN_EMAIL="admin@v40vital.hu"
ADMIN_PASSWORD="<erős-jelszó>"

# A publikus domain (e-mail linkek, Stripe redirect, PDF-linkek)
PUBLIC_BASE_URL="https://v40vital.hu"

# A cron-endpointok védelme:  openssl rand -hex 24
CRON_SECRET="<véletlen-titok>"
```

Opcionális (ezek **adminból is beállíthatók**, lásd 8. pont – ha ott kitöltöd,
a `.env` nem is kell hozzájuk):

```dotenv
# Stripe (kártya-fizetés, kártya-biztosíték).  Éles kulcsok: sk_live_/pk_live_
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Számlázz.hu Számla Agent kulcs (számla + NAV-beküldés)
SZAMLAZZHU_AGENT_KEY=""

# SMTP (visszaigazoló/emlékeztető/számla e-mailek) – adminból is állítható
SMTP_HOST=""; SMTP_PORT="587"; SMTP_USER=""; SMTP_PASS=""; MAIL_FROM="V40 Vital <info@v40vital.hu>"

# AI-fordítás új nyelvhez (opcionális; enélkül a meglévő HU/EN/DE marad)
ANTHROPIC_API_KEY=""
```

> **Fontos:** titkos kulcsokat vagy a `.env`-be, vagy az adminba tegyél, de a
> forráskódba SOHA. Az SMS (Twilio) és a fizetési/számlázási szolgáltató
> beállításai az admin **Beállítások** oldalán is megadhatók.

---

## 4. Telepítés és adatbázis

```bash
npm ci            # függőségek pontos telepítése – NE használj --production/--omit=dev,
                  #   mert a prisma és a tsx (a seed+import futtatója) devDependency!
npm run db:setup  # EGY lépés: migrate deploy + seed + tartalom-import (lásd lentebb)
```

A `db:setup` a következő három parancsot futtatja egymás után (ha külön akarod):

```bash
npx prisma migrate deploy             # az összes migráció alkalmazása az éles DB-re
npx prisma db seed                    # kezdő adatok + az admin felhasználó (HU alap)
npm run content:import                # a teljes szöveg + FORDÍTÁSOK + kezeléstípusok betöltése
```

> **A leggyakoribb telepítési hiba:** a `content:import` (import-content.ts) lépés
> kimaradása vagy hibára futása. Ekkor a magyar alaptartalom megjelenik, DE **nincs
> EN/DE fordítás**, a nyelvváltás „nem működik", és az adminban minden „hiányzik".
> Ezért van a `db:setup`, ami mindent egyben futtat, és **megáll, ha bármelyik lépés
> hibázik** – így nem marad észrevétlen.
>
> - `migrate deploy` (nem `migrate dev`): csak a meglévő migrációkat alkalmazza. A
>   sorrend fontos: a migráció hozza létre pl. a kategória `heroImage` oszlopát,
>   amit az import használ. Ha az importot a migráció ELŐTT futtatod, elhasal.
> - Ha `--production` telepítést használtál és a `tsx`/`prisma` hiányzik, a
>   seed/import csendben nem fut le → **teljes `npm ci` kell**.
> - A tartalom a **`prisma/content-export.json`**-ban van (954 szöveg, 1192 fordítás).
>   Az import idempotens, slug alapú, bármikor újrafuttatható.
>
> **Sikeres import jele** (ezt ki kell írnia):
> `Tartalom betöltve: 954 szöveg, 15 kezeléstípus, … 1192 fordítás (0 kihagyva …).`
> Ha ezt a sort nem látod, az import NEM futott le rendben.
>
> A nyers forrásdokumentumok (amikből a kezeléstípus-leírások készültek) az
> `Anyagok/` mappában vannak, hivatkozásként.

---

## 5. Build és futtatás

```bash
npm run build                # -> .output/ (önálló Node szerver)
node .output/server/index.mjs   # teszt-indítás; alapból a 3000-es porton
```

Portot a `PORT` környezeti változóval állíthatsz: `PORT=3002 node .output/server/index.mjs`.

### pm2 (ajánlott)

```bash
npm i -g pm2
PORT=3002 pm2 start ".output/server/index.mjs" --name v40 --update-env
pm2 save && pm2 startup
```

### vagy systemd (`/etc/systemd/system/v40.service`)

```ini
[Unit]
Description=V40 Vital
After=network.target mysql.service

[Service]
WorkingDirectory=/var/www/v40
Environment=PORT=3002
EnvironmentFile=/var/www/v40/.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now v40
```

---

## 6. Reverse proxy + HTTPS (nginx)

```nginx
server {
  server_name v40vital.hu;
  client_max_body_size 20m;         # a dokumentum-feltöltésekhez (max 15 MB)

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

HTTPS-t a legegyszerűbb Certbottal (`certbot --nginx -d v40vital.hu`).

---

## 7. Perzisztens tárolók (NAGYON fontos)

Két könyvtár a futás során jön létre, és **deploy/újraépítés között meg kell
maradnia** (ne kerüljön a build alá, ne töröld):

- `public/uploads/` – admin által feltöltött **képek** (kezelés/orvos/típus ikon).
- `storage/patient-docs/` – **páciens-dokumentumok** (orvosi adat, nem publikus).

Ajánlott ezeket a repón kívüli állandó helyre tenni és **symlinkelni**:

```bash
mkdir -p /var/v40-data/uploads /var/v40-data/patient-docs
ln -s /var/v40-data/uploads       /var/www/v40/public/uploads
ln -s /var/v40-data/patient-docs  /var/www/v40/storage/patient-docs
```

> A `storage/` a `.gitignore`-ban van; a páciens-dokumentumok soha nem
> publikusak, csak a jogosult (páciens / hozzárendelt orvos / staff) éri el a
> `/api/documents/:id/download` végponton át.

---

## 8. Fizetés, számlázás, e-mail, SMS beállítása

Belépés: `https<:>//v40vital.hu/admin` (az e-mail/jelszó a seed `ADMIN_*`).
Az **admin → Beállítások** oldalon állítható (kód nélkül):

- **Fizetés:** online kártya ki/be, kártya-biztosíték, no-show díj %, pénznem.
  A valódi Stripe kulcsokat a `.env`-be tedd (biztonság). Stripe **webhook URL**:
  `https<:>//v40vital.hu/api/webhooks/stripe` (esemény: `setup_intent.succeeded`,
  `payment_intent.succeeded`); a kapott `whsec_...`-t a `STRIPE_WEBHOOK_SECRET`-be.
- **Apple Pay / Google Pay:** a kódban MÁR be van kapcsolva (Stripe Payment
  Element + `automatic_payment_methods`), külön fejlesztés nem kell. Ahhoz, hogy
  a fizetőfelületen megjelenjen:
  1. Legyenek **éles** Stripe-kulcsok (`sk_live_/pk_live_`), különben mock mód van.
  2. **Google Pay:** semmi teendő – Chrome/Android eszközön automatikusan jön.
  3. **Apple Pay:** a Stripe Dashboard → *Settings → Payment methods → Apple Pay*
     alatt **regisztráld a domaint** (`v40vital.hu`). A Payment Elementnél a Stripe
     általában automatikusan elhelyezi a domain-igazoló fájlt; ha kézi kell,
     a `/.well-known/apple-developer-merchantid-domain-association` fájlt a Stripe adja.
  4. Tesztelni **valódi eszközön** kell: Apple Pay → Safari/iOS (kártya a Wallet-ben),
     Google Pay → Chrome/Android. Asztali böngészőben nem mindig jelenik meg.
- **Számlázás:** automatikus számlázás ki/be. A Számlázz.hu Agent-kulcs a
  `.env`-ben (`SZAMLAZZHU_AGENT_KEY`); a fiók legyen a NAV-hoz bekötve.
- **E-mail (SMTP):** host/port/user/jelszó/feladó – itt is megadható.
- **SMS (Twilio):** provider = Twilio, Account SID, Auth Token, küldő szám;
  az „SMS emlékeztető" kapcsolót az Emlékeztető szekcióban kapcsold be.

Ha egy szolgáltató nincs beállítva, a rendszer **mock** módban fut (nincs valós
terhelés/számla/e-mail/SMS), így minden hiba nélkül tesztelhető.

---

## 9. Ütemezett feladatok (cron)

A szerver crontabjába (a `CRON_SECRET`-tel, ahogy a `.env`-ben):

```cron
# Emlékeztetők (1 nappal előtte + aznap reggel) – óránként
0 * * * * curl -fsS -X POST -H "x-cron-secret: A_TITKOD" https://v40vital.hu/api/cron/send-reminders
# Lejárt idősáv-zárolások felszabadítása – 5 percenként
*/5 * * * * curl -fsS -X POST -H "x-cron-secret: A_TITKOD" https://v40vital.hu/api/cron/release-holds
```

---

## 10. Frissítés (új verzió kitelepítése)

```bash
cd /var/www/v40
# új forrás kicsomagolása a régi fölé (a public/uploads és storage symlink marad)
tar xzf v40-vital-forras.tar.gz
npm ci
npx prisma migrate deploy
npm run build
pm2 restart v40      # vagy: systemctl restart v40
```

> Adatbázis-migráció után a Node-folyamatot **újra kell indítani** (a fejlesztői
> szerver is emiatt viselkedett hibásan migrációkor).

---

## 11. Biztonsági mentés

- **Adatbázis:** `mysqldump v40 > backup.sql` (napi, automatikusan).
- **Fájlok:** `/var/v40-data/` (uploads + patient-docs) rendszeres mentése.

A számlák NAV-adatai a Számlázz.hu-nál is megvannak; a fizetések a Stripe-nál.
A `MedicalOpinion` és a `PatientDocument` viszont csak nálad – ezeket mentsd.

---

## 12. Gyors ellenőrzőlista élesítés után

- [ ] `https<:>//v40vital.hu` betölt, nyelvváltó működik (HU/EN/DE)
- [ ] `/admin` – belépés az admin fiókkal
- [ ] Beállítások: Stripe/Számlázz.hu/SMTP/SMS státusz „éles"
- [ ] Stripe webhook beállítva és tesztelve
- [ ] Cron-ok futnak (emlékeztető, hold-felszabadítás)
- [ ] `public/uploads` és `storage/patient-docs` symlinkelve és írható
- [ ] Napi DB- és fájl-mentés beállítva
```
