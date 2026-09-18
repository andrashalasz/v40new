/**
 * Az alkalmazás saját szövegei.
 *
 * KÉT forrásból jön szöveg, és fontos nem összekeverni őket:
 *
 *   - Ami ITT van: a felület állandó szavai (gombok, címkék, hibaüzenetek).
 *     Ezek a kódhoz tartoznak, nem szerkeszti őket senki az adminból.
 *
 *   - Ami az adatbázisból jön: kezelésnevek, leírások, bérletek – ezeket az
 *     /api/... végpontok már a kért nyelven adják vissza, a `locale`
 *     paraméter alapján.
 *
 * A magyar a teljes lista; a többi nyelv ugyanezekkel a kulcsokkal dolgozik.
 * A típus a magyarból származik, ezért egy hiányzó kulcs fordítási hiba lesz,
 * nem futásidejű meglepetés.
 */

export const hu = {
  'tab.treatments': 'Kezelések',
  'tab.passes': 'Bérletek',
  'tab.bookings': 'Foglalásaim',
  'tab.health': 'Egészség',
  'tab.account': 'Fiókom',

  'language.title': 'Nyelv',
  'language.auto': 'Automatikus',
  'language.changeLater': 'Később bármikor módosíthatod a Fiókom menüben.',
  'language.deviceHint': 'A telefonod nyelve szerint',
  'health.consentOtherAccount': 'Ehhez a fiókhoz még nem érkezett egészségügyi adat. Ha korábban másik fiókkal szinkronizáltál, az adat ott van – a hozzájárulás és az adat is fiókonként külön áll.',
  'health.syncedCount': 'Eddig {count} napi érték érkezett ehhez a fiókhoz.',
  'common.all': 'Minden',
  'common.loading': 'Betöltés…',
  'common.retry': 'Újrapróbálom',
  'common.minutes': 'perc',
  'common.signIn': 'Belépés',
  'common.signOut': 'Kijelentkezés',
  'common.back': 'Vissza',
  'common.identifier': 'Azonosító',

  'error.network': 'Nincs kapcsolat a szerverrel. Ellenőrizd az internetet.',
  'error.generic': 'Váratlan hiba történt. Próbáld újra.',
  'error.sessionExpired': 'A munkamenet lejárt, jelentkezz be újra.',

  'treatments.loading': 'Kezelések betöltése…',
  'treatments.empty': 'Ebben a kategóriában jelenleg nincs foglalható kezelés.',
  'treatments.book': 'Időpontot választok',
  'treatments.vatIncluded': 'bruttó, 27% áfa',
  'treatments.vatExempt': 'áfamentes egészségügyi szolgáltatás',

  'booking.title': 'Időpontfoglalás',
  'booking.loadingService': 'Kezelés betöltése…',
  'booking.loadingSlots': 'Szabad időpontok keresése…',
  'booking.noSlots':
    'Ehhez a kezeléshez jelenleg nincs online foglalható időpont. Kérlek hívj minket, és telefonon egyeztetünk.',
  'booking.practitioner': 'Szakember',
  'booking.day': 'Nap',
  'booking.time': 'Időpont',
  'booking.noSlotsForPractitioner':
    'Ennél a szakembernél a következő két hétben nincs szabad időpont.',
  'booking.yourDetails': 'Adataid',
  'booking.detailsHint': 'A visszaigazolást és a belépő linket erre a címre küldjük.',
  'booking.lastName': 'Vezetéknév',
  'booking.firstName': 'Keresztnév',
  'booking.email': 'E-mail',
  'booking.phone': 'Telefonszám',
  'booking.payment': 'Fizetési mód',
  'booking.summary': 'Összegzés',
  'booking.treatment': 'Kezelés',
  'booking.duration': 'Időtartam',
  'booking.vat': 'Áfa',
  'booking.total': 'Fizetendő',
  'booking.confirm': 'Foglalás megerősítése',
  'booking.failed': 'A foglalás nem sikerült.',
  'booking.success': 'Sikeres foglalás',
  'booking.successHint': 'A visszaigazolást e-mailben is elküldtük.',
  'booking.myBookings': 'Foglalásaim',
  'booking.moreTreatments': 'További kezelések',

  'settlement.onSite': 'Fizetés a helyszínen',
  'settlement.onSiteHint': 'Készpénzzel vagy bankkártyával a rendelőben.',
  'settlement.pass': 'Bérletből levonás',
  'settlement.passHint':
    'Ha van érvényes bérleted a kezelésre, a rendszer levon egy alkalmat.',
  'settlement.card': 'Bankkártyás fizetés',
  'settlement.cardHint': 'A foglalás a sikeres fizetéssel véglegesül.',

  'bookings.loading': 'Foglalások betöltése…',
  'bookings.upcoming': 'Közelgő',
  'bookings.past': 'Korábbi',
  'bookings.noUpcoming': 'Jelenleg nincs közelgő foglalásod.',
  'bookings.noPast': 'Még nincs lezárt kezelésed.',
  'bookings.price': 'Ár',

  'status.HOLD': 'Foglalás folyamatban',
  'status.PENDING_PAYMENT': 'Fizetésre vár',
  'status.CONFIRMED': 'Megerősítve',
  'status.COMPLETED': 'Megtörtént',
  'status.NO_SHOW': 'Nem jelent meg',
  'status.CANCELLED': 'Lemondva',

  'passes.loading': 'Bérletek betöltése…',
  'passes.mine': 'Az én bérleteim',
  'passes.noneMine': 'Jelenleg nincs érvényes bérleted.',
  'passes.available': 'Megvásárolható bérletek',
  'passes.noneAvailable': 'Jelenleg nincs elérhető bérlet.',
  'passes.sessionsLeft': '{remaining} alkalom maradt a(z) {total}-ből',
  'passes.sessions': 'Alkalmak',
  'passes.sessionsValue': '{count} alkalom',
  'passes.validity': 'Érvényesség',
  'passes.validityValue': '{days} nap',
  'passes.validUntil': 'Érvényes',
  'passes.code': 'Kód',
  'passes.price': 'Ár',
  'passes.buyOnWeb':
    'A bérlet megvásárlása jelenleg a weboldalon lehetséges. Az appon belüli vásárlás a fizetési modul beépítése után lesz elérhető.',

  'account.loading': 'Fiók betöltése…',
  'account.title': 'Fiókom',
  'account.email': 'E-mail',
  'account.phone': 'Telefon',
  'account.opinions': 'Szakvélemények',
  'account.noOpinions': 'Még nincs szakvéleményed.',
  'account.documents': 'Dokumentumaim',
  'account.noDocuments': 'Még nem töltöttél fel leletet.',
  'account.invoices': 'Számlák',
  'account.noInvoices': 'Még nincs számlád.',
  'account.storno': '(sztornó)',

  'signIn.title': 'Belépés',
  'signIn.subtitle': 'A foglalásaid, bérleteid és dokumentumaid egy helyen.',
  'signIn.password': 'Jelszó',
  'signIn.failed': 'A belépés nem sikerült.',
  'signIn.hint':
    'Ha foglaltál már nálunk, a fiókod automatikusan létrejött. Jelszó nélkül e-mailes belépő linket is kérhetsz a weboldalon.',
  'signIn.required': 'Ehhez belépés kell',
  'signIn.requiredBookings': 'A foglalásaid megtekintéséhez lépj be a fiókodba.',
  'signIn.requiredAccount': 'A fiókod adataihoz, számláihoz és dokumentumaihoz lépj be.',
} as const

export type StringKey = keyof typeof hu
export type Strings = Record<StringKey, string>
