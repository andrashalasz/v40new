import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
//  Az admin jelszó KÖRNYEZETI VÁLTOZÓBÓL jön.
//  A korábbi seed egy fix jelszót égetett a repóba – ez minden
//  klónozónak megadta volna az admin hozzáférést, ezért így nem maradhat.
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const H = (h: number, m = 0) => h * 60 + m; // helyi perc éjfél óta
const TAM = "TAM – Áfa tv. 85. § (1) c) egészségügyi szolgáltatás";

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Az ADMIN_EMAIL és ADMIN_PASSWORD környezeti változó kötelező.\n" +
        'Példa: ADMIN_EMAIL=admin@v40vital.hu ADMIN_PASSWORD="..." npm run seed'
    );
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error("Az ADMIN_PASSWORD legyen legalább 12 karakter.");
  }

  // ---------------------------------------------------------------- admin ---
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "ADMIN",
      firstName: "Admin",
      emailVerifiedAt: new Date(),
    },
  });

  // ------------------------------------------------------------ beállítások --
  await prisma.clinicSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // ---------------------------------------------------------------- nyelvek --
  // A magyar az alap; az angol és a német felvitelekor az adminban AI fordít.
  const languages = [
    { code: "hu", name: "Magyar", isDefault: true, sortOrder: 0 },
    { code: "en", name: "English", isDefault: false, sortOrder: 1 },
    { code: "de", name: "Deutsch", isDefault: false, sortOrder: 2 },
  ];
  for (const l of languages) {
    await prisma.language.upsert({
      where: { code: l.code },
      update: { name: l.name, isDefault: l.isDefault, sortOrder: l.sortOrder },
      create: l,
    });
  }

  // Nyitvatartás a weboldalon kommunikált értékek szerint: H–P 7–19, Szo 8–12
  if ((await prisma.clinicHours.count()) === 0) {
    await prisma.clinicHours.createMany({
      data: [
        ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: H(7), endMinute: H(19) })),
        { weekday: 6, startMinute: H(8), endMinute: H(12) },
      ],
    });
  }

  // ----------------------------------------------------------------- szobák --
  const rooms = [];
  for (const [i, name] of ["Infúziós szoba A", "Infúziós szoba B", "Vizsgáló", "Kezelő"].entries()) {
    rooms.push(
      await prisma.room.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } })
    );
  }

  // ------------------------------------------------------- kezelés-típusok ---
  // A longDesc a nyitóoldali felugró ablak tartalma (bekezdések tömbje).
  const categories = [
    {
      slug: "infuzios-kezelesek",
      name: "Infúziós kezelések",
      shortDesc:
        "Az infúziós vitaminterápia során vitaminok, ásványi anyagok és antioxidánsok közvetlenül a véráramba kerülnek, így gyorsan hasznosulnak.",
      longDesc: [
        "Az infúziós vitaminterápia során a hatóanyagok kihagyják az emésztőrendszert, és közvetlenül a véráramba kerülnek. Így a felszívódás nem függ a bélrendszer állapotától.",
        "A kezelés előtt minden esetben laborvizsgálat és orvosi konzultáció történik. Az összetételt ennek eredménye alapján állítjuk össze.",
        "Egy infúzió jellemzően 45–90 perc, kényelmes fekvőfotelben. A kezelés után nincs felépülési idő.",
        "Leggyakoribb indikációk: krónikus fáradtság, sportterhelés utáni regeneráció, immunrendszer támogatása, felszívódási zavarok.",
      ],
    },
    {
      slug: "mikrobiome-programok",
      name: "Mikrobiome programok",
      shortDesc:
        "A bélflóra egyensúlya alapvetően befolyásolja az emésztést, az immunrendszert és az anyagcserét.",
      longDesc: [
        "A bélflóra összetétele kapcsolatban áll az immunrendszer működésével, az anyagcserével és a gyulladásos folyamatokkal is.",
        "A program egy otthon elvégezhető minta beküldésével indul. A laboratóriumi elemzés megmutatja a domináns baktériumtörzseket és a diverzitást.",
        "Az eredményt orvosunk értékeli ki, és ez alapján készül a személyre szabott étrendi javaslat.",
        "A kontrollvizsgálat jellemzően 3–6 hónap múlva javasolt, hogy a változás mérhető legyen.",
      ],
    },
    {
      slug: "v40-shape",
      name: "V40 SHAPE",
      shortDesc:
        "Orvosi testformálás elektromágneses és rádiófrekvenciás technológiával, műtét nélkül.",
      longDesc: [
        "A V40 SHAPE egy modern, orvosi testformáló kezelés, amely nagy intenzitású elektromágneses (HIFEM) és rádiófrekvenciás technológiával aktiválja a mélyizmokat.",
        "A kezelés során a célzott izomcsoportok olyan intenzív összehúzódásokat végeznek, amelyek akaratlagos edzéssel nem érhetők el. Ez segíthet az izomtónus javításában és a testkontúr formálásában.",
        "Műtét és felépülési idő nélkül végezhető; egy alkalom jellemzően 30 perc. A tartós eredményhez több kezelésből álló kúra javasolt.",
        "Nem fogyókúrás módszer: a legjobb eredményt aktív életmód és kiegyensúlyozott táplálkozás mellett adja.",
      ],
    },
    {
      slug: "orvosi-testsulycsokkentes",
      name: "Orvosi testsúlycsökkentés",
      shortDesc:
        "Orvosi felügyelet melletti, fenntartható testsúlycsökkentés az anyagcsere-egészségért.",
      longDesc: [
        "Az orvosi testsúlycsökkentő program célja a biztonságos, fenntartható fogyás és az anyagcsere-egészség javítása, végig orvosi felügyelet mellett.",
        "A program állapotfelméréssel és laborvizsgálattal indul, hogy a terv a valós anyagcsere-állapotra épüljön, ne általános diétára.",
        "A cél nem a gyors, hanem a tartós eredmény: a szív- és érrendszeri kockázatok csökkentése és az elért súly megtartása.",
        "A folyamatot rendszeres kontroll és személyre szabott finomhangolás kíséri.",
      ],
    },
    {
      slug: "anyajegy-vizsgalat",
      name: "Anyajegy vizsgálat",
      shortDesc:
        "FotoFinder digitális anyajegyszűrés a bőrelváltozások korai felismerésére.",
      longDesc: [
        "A FotoFinder technológiával végzett digitális anyajegyszűrés nagy felbontású, teljes testtérképet készít a bőr elváltozásairól.",
        "A rögzített képek lehetővé teszik, hogy a legkisebb változásokat is időben, objektíven össze lehessen hasonlítani a korábbi állapottal.",
        "Ez segíti a bőrrák és a melanoma korai felismerését, ami a sikeres kezelés egyik legfontosabb tényezője.",
        "A vizsgálatot bőrgyógyász végzi és értékeli ki; évente ismételt szűrés javasolt, fokozott kockázat esetén gyakrabban.",
      ],
    },
    {
      slug: "diagnosztika",
      name: "Diagnosztika",
      shortDesc: "Laborpanelek és műszeres vizsgálatok orvosi kiértékeléssel.",
      longDesc: [
        "A diagnosztikai csomagok célja, hogy a döntések mérhető adatokon alapuljanak, ne feltételezéseken.",
        "Minden eredményt orvos értékel ki, és személyes konzultáció keretében beszélünk át.",
      ],
    },
    {
      slug: "konzultacio",
      name: "Konzultáció",
      shortDesc: "Első orvosi beszélgetés, célkitűzés és programtervezés.",
      longDesc: [
        "A konzultáció során felmérjük az előzményeket, a panaszokat és a célokat.",
        "Ennek alapján dől el, hogy milyen állapotfelmérés indokolt – nem kérünk feleslegesen vizsgálatokat.",
      ],
    },
  ];

  const catMap: Record<string, number> = {};
  for (const [i, c] of categories.entries()) {
    const row = await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { shortDesc: c.shortDesc, longDesc: c.longDesc, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
    catMap[c.slug] = row.id;
  }

  // -------------------------------------------------------------- kezelések --
  // A magán egészségügyi szolgáltatás áfamentes (Áfa tv. 85. §), az esztétikai
  // jellegű kezelés viszont jellemzően 27%-os – ezért van kezelés-szintű áfa.
  // A kezelés-nevek a valós katalógusból (a feltöltött forráskód
  // Search.vue orderReference listája). Az ÁRAK és IDŐTARTAMOK egyelőre
  // PLACEHOLDER értékek – ezeket a rendelő pontosítja (adminból vagy megadott
  // listából). Az infúziók és a mikrobiom programok egészségügyi szolgáltatások,
  // ezért áfamentesek (TAM); ha valamelyik esztétikai jellegű, adminból 27%-ra
  // állítható.
  const services = [
    // ---- Infúziós kezelések ----
    { slug: "nad-sejtszintu-regeneralo", title: "NAD+ sejtszintű regeneráló infúzió", cat: "infuzios-kezelesek", picUrl: "41.jpeg",
      priceGross: 145000, vatRate: 0, durationMin: 90, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "NAD+ prekurzorokkal támogatja a sejtszintű energiatermelést és a regenerációt, orvosi felügyelet mellett." },
    { slug: "premium-vitamin-asvanyi", title: "Prémium vitamin- és ásványianyag infúzió", cat: "infuzios-kezelesek", picUrl: "8.png",
      priceGross: 89000, vatRate: 0, durationMin: 60, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Magas dózisú vitaminok és ásványi anyagok közvetlenül a véráramba, a hiányállapotok gyors pótlására." },
    { slug: "immunerosito", title: "Immunerősítő infúzió", cat: "infuzios-kezelesek", picUrl: "41.jpeg",
      priceGross: 79000, vatRate: 0, durationMin: 60, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Az immunrendszer működését támogató, magas antioxidáns-tartalmú vitaminprotokoll." },
    { slug: "bormegujito-ragyogas", title: "Bőrmegújító és ragyogást támogató infúzió", cat: "infuzios-kezelesek", picUrl: "18.png",
      priceGross: 99000, vatRate: 0, durationMin: 60, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Kollagén-szintézist és bőrregenerációt támogató hatóanyagok az egészségesebb, ragyogóbb bőrképért." },
    { slug: "posztmenopauzalis-vitalitas", title: "Posztmenopauzális vitalitástámogató infúzió", cat: "infuzios-kezelesek", picUrl: "26.png", gender: "Női",
      priceGross: 99000, vatRate: 0, durationMin: 75, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "A posztmenopauzális időszak energiaszintjét és közérzetét támogató, célzottan összeállított összetétel." },
    { slug: "noi-hormonalis-egyensuly", title: "Női hormonális egyensúlyt támogató infúzió", cat: "infuzios-kezelesek", picUrl: "17.png", gender: "Női",
      priceGross: 99000, vatRate: 0, durationMin: 75, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "A női hormonális egyensúly helyreállítását segítő mikrotápanyagok, orvosi kiértékelés mellett." },
    { slug: "teljesitmenyfokozo-sport", title: "Teljesítményfokozó sportinfúzió", cat: "infuzios-kezelesek", picUrl: "12.png",
      priceGross: 109000, vatRate: 0, durationMin: 75, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Aminosav- és elektrolit-alapú összetétel a sportteljesítmény és a terhelhetőség támogatására." },
    { slug: "gyors-regeneracio", title: "Gyors regenerációt támogató infúzió", cat: "infuzios-kezelesek", picUrl: "41.jpeg",
      priceGross: 89000, vatRate: 0, durationMin: 60, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Intenzív terhelés vagy fáradtság utáni gyors regenerációt segítő folyadék- és tápanyagpótlás." },
    { slug: "keringes-terhelhetoseg", title: "Keringést és terhelhetőséget támogató infúzió", cat: "infuzios-kezelesek", picUrl: "17.png",
      priceGross: 99000, vatRate: 0, durationMin: 75, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "A keringés és a fizikai terhelhetőség támogatására összeállított infúziós protokoll." },
    { slug: "majregeneracio-mereg", title: "Májregenerációs és méregtelenítő infúzió", cat: "infuzios-kezelesek", picUrl: "8.png",
      priceGross: 99000, vatRate: 0, durationMin: 75, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "A máj méregtelenítő működését és regenerációját támogató, antioxidánsban gazdag összetétel." },
    { slug: "premium-vitalitas", title: "Prémium vitalitástámogató infúzió", cat: "infuzios-kezelesek", picUrl: "26.png",
      priceGross: 129000, vatRate: 0, durationMin: 90, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Komplex, magas dózisú vitalitás-protokoll a tartós energiaszintért és a jobb közérzetért." },
    // ---- Mikrobiome programok ----
    { slug: "belrendszeri-egyensuly-mikrobiom", title: "Bélrendszeri egyensúlyt támogató mikrobiom program", cat: "mikrobiome-programok", picUrl: "21.png",
      priceGross: 119000, vatRate: 0, durationMin: 45, bufferBeforeMin: 0, bufferAfterMin: 10,
      minLeadTimeHours: 48, maxLeadTimeDays: 90, rooms: ["Vizsgáló"],
      desc: "Mikrobiom-elemzésre épülő, személyre szabott bélflóra-egyensúly program, orvosi kiértékeléssel." },
    { slug: "sziv-bel-egyensuly-mikrobiom", title: "Szív–bél egyensúlyt támogató mikrobiom program", cat: "mikrobiome-programok", picUrl: "21.png",
      priceGross: 129000, vatRate: 0, durationMin: 45, bufferBeforeMin: 0, bufferAfterMin: 10,
      minLeadTimeHours: 48, maxLeadTimeDays: 90, rooms: ["Vizsgáló"],
      desc: "A szív–bél tengely egyensúlyát célzó mikrobiom program a kardiovaszkuláris egészség támogatására." },
    { slug: "sportoloi-mikrobiom", title: "Sportolói teljesítményt támogató mikrobiom program", cat: "mikrobiome-programok", picUrl: "12.png",
      priceGross: 119000, vatRate: 0, durationMin: 45, bufferBeforeMin: 0, bufferAfterMin: 10,
      minLeadTimeHours: 48, maxLeadTimeDays: 90, rooms: ["Vizsgáló"],
      desc: "Sportolóknak összeállított mikrobiom program a regeneráció és a teljesítmény támogatására." },
  ];

  const svcMap: Record<string, number> = {};
  for (const [i, s] of services.entries()) {
    const { cat, rooms: roomList, ...rest } = s;
    const row = await prisma.service.upsert({
      where: { slug: s.slug },
      // picUrl frissül a meglévő soroknál is, hogy a seed feltöltse a képeket
      // (a többi mezőt nem írjuk felül, hogy az admin szerkesztései megmaradjanak)
      update: { picUrl: rest.picUrl ?? null },
      create: {
        ...rest,
        vatExemptReason: s.vatRate === 0 ? TAM : null,
        categoryId: cat ? catMap[cat] : null,
        sortOrder: i,
        metaTitle: `${s.title} | V40 Vital`,
        metaDescription: s.desc.slice(0, 155),
      },
    });
    svcMap[s.slug] = row.id;

    for (const rn of roomList) {
      const room = rooms.find((r) => r.name === rn)!;
      await prisma.serviceRoom.upsert({
        where: { serviceId_roomId: { serviceId: row.id, roomId: room.id } },
        update: {},
        create: { serviceId: row.id, roomId: room.id },
      });
    }
  }

  // A katalógusból kikerült korábbi kezeléseket archiváljuk (törölni a
  // foglalás-előzmény miatt nem lehet).
  const keepServiceSlugs = services.map((s) => s.slug);
  await prisma.service.updateMany({
    where: { slug: { notIn: keepServiceSlugs }, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  // ------------------------------------------------------------ szakemberek --
  // A négy orvos a valós adatok szerint. A picUrl a public/ mappában várt
  // fájlnévre mutat – a fotókat ide kell feltölteni (vagy adminból cserélni).
  const practitioners = [
    { slug: "dr-vertes-andras", name: "Dr. Vértes András", titles: "Dr.", picUrl: "orvos-vertes.png",
      category: "Szív- és érrendszeri prevenció, belgyógyászat",
      desc: "Több évtizedes tapasztalattal foglalkozik a szív- és érrendszeri betegségek megelőzésével, korai felismerésével és komplex kezelésével.",
      hours: { 1: [[H(9), H(13)], [H(14), H(19)]], 2: [[H(9), H(19)]], 4: [[H(9), H(19)]], 5: [[H(9), H(17)]] },
      services: ["keringes-terhelhetoseg", "premium-vitalitas", "immunerosito", "nad-sejtszintu-regeneralo"] },
    { slug: "dr-szabo-renata", name: "Dr. Szabó Renáta", titles: "Dr.", picUrl: "orvos-szabo.png",
      category: "Bőrgyógyász",
      desc: "Személyre szabott megközelítéssel és korszerű vizsgálatokkal segít a bőrproblémák biztonságos megoldásában.",
      hours: { 2: [[H(10), H(18)]], 3: [[H(10), H(18)]], 5: [[H(10), H(16)]] },
      services: ["bormegujito-ragyogas", "premium-vitamin-asvanyi"] },
    { slug: "dr-peter-emoke", name: "Dr. Péter Emőke", titles: "Dr.", picUrl: "orvos-peter.png",
      category: "Ér- és anyagcsere-központú belgyógyászat",
      desc: "Személyre szabott megközelítéssel segít az anyagcsere-egyensúly helyreállításában és a krónikus betegségek megelőzésében.",
      hours: { 1: [[H(9), H(17)]], 2: [[H(9), H(17)]], 4: [[H(12), H(19)]], 5: [[H(9), H(15)]] },
      services: ["nad-sejtszintu-regeneralo", "noi-hormonalis-egyensuly", "posztmenopauzalis-vitalitas", "majregeneracio-mereg", "belrendszeri-egyensuly-mikrobiom", "sziv-bel-egyensuly-mikrobiom"] },
    { slug: "dr-gajer-mate", name: "Dr. Gájer Máté", titles: "Dr.", picUrl: "orvos-gajer.png",
      category: "Életmódközpontú belgyógyászat",
      desc: "Az életmód-orvoslás eszközeivel segít a fenntartható, hosszú távú egészség kialakításában: táplálkozás, mozgás és regeneráció együtt.",
      hours: { 1: [[H(8), H(15)]], 3: [[H(8), H(15)]], 4: [[H(8), H(15)]], 6: [[H(8), H(12)]] },
      services: ["teljesitmenyfokozo-sport", "gyors-regeneracio", "sportoloi-mikrobiom", "premium-vitamin-asvanyi", "immunerosito"] },
  ];

  for (const p of practitioners) {
    const { hours, services: svcList, ...rest } = p;
    const row = await prisma.practitioner.upsert({
      where: { slug: p.slug },
      // picUrl frissül a meglévő soroknál is, hogy a seed feltöltse a fotókat
      update: { picUrl: rest.picUrl ?? null },
      create: rest,
    });

    if ((await prisma.workingHours.count({ where: { practitionerId: row.id } })) === 0) {
      await prisma.workingHours.createMany({
        data: Object.entries(hours).flatMap(([wd, blocks]) =>
          (blocks as number[][]).map(([startMinute, endMinute]) => ({
            practitionerId: row.id,
            weekday: Number(wd),
            startMinute,
            endMinute,
          }))
        ),
      });
    }

    for (const sl of svcList) {
      await prisma.servicePractitioner.upsert({
        where: { serviceId_practitionerId: { serviceId: svcMap[sl], practitionerId: row.id } },
        update: {},
        create: { serviceId: svcMap[sl], practitionerId: row.id },
      });
    }
  }

  // A korábbi seed kitalált orvosait archiváljuk, ha még aktívak – így eltűnnek
  // a publikus listából, de a rájuk hivatkozó foglalás-előzmény sértetlen marad
  // (törölni nem lehet, mert a foglalás rá hivatkozik).
  const keepSlugs = practitioners.map((p) => p.slug);
  await prisma.practitioner.updateMany({
    where: { slug: { notIn: keepSlugs }, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  // ---------------------------------------------------------------- bérletek --
  const passes = [
    { slug: "nad-berlet-5", title: "NAD+ Bérlet – 5 alkalom", priceGross: 620000, vatRate: 0,
      sessionCount: 5, validityDays: 180, services: ["nad-sejtszintu-regeneralo"],
      desc: "Öt alkalom NAD+ sejtszintű regeneráló infúzióra, a vásárlástól számított 180 napon belül." },
    { slug: "infuzios-berlet-10", title: "Infúziós Bérlet – 10 alkalom", priceGross: 1090000, vatRate: 0,
      sessionCount: 10, validityDays: 365,
      services: ["nad-sejtszintu-regeneralo", "premium-vitamin-asvanyi", "teljesitmenyfokozo-sport"],
      desc: "Tíz alkalom, szabadon felhasználva a kiválasztott infúziós kezelésekre." },
    { slug: "bormegujito-berlet-3", title: "Bőrmegújító Bérlet – 3 alkalom", priceGross: 270000, vatRate: 0,
      sessionCount: 3, validityDays: 120, services: ["bormegujito-ragyogas"],
      desc: "Három alkalom bőrmegújító és ragyogást támogató infúzióra." },
  ];

  for (const [i, p] of passes.entries()) {
    const { services: svcList, ...rest } = p;
    const row = await prisma.passTemplate.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...rest, vatExemptReason: p.vatRate === 0 ? TAM : null, sortOrder: i },
    });
    // A bérlet-kezelés összerendeléseket a seed alapján állítjuk be, a
    // korábbiakat töröljük (különben archivált kezelésre mutató link maradna).
    await prisma.passTemplateService.deleteMany({ where: { passTemplateId: row.id } });
    for (const sl of svcList) {
      await prisma.passTemplateService.upsert({
        where: { passTemplateId_serviceId: { passTemplateId: row.id, serviceId: svcMap[sl] } },
        update: {},
        create: { passTemplateId: row.id, serviceId: svcMap[sl] },
      });
    }
  }

  // A katalógusból kikerült korábbi bérletek archiválása.
  const keepPassSlugs = passes.map((p) => p.slug);
  await prisma.passTemplate.updateMany({
    where: { slug: { notIn: keepPassSlugs }, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  // ------------------------------------------------- szerkeszthető szövegek --
  // Minden frontend-szöveg innen jön. A kódban csak alapértelmezés van, amit
  // ez felülír – így a szerkesztés nem tud üres oldalt eredményezni.
  const content: Array<[string, string, string, string, string]> = [
    ["home.hero.title", "home", "hero", "Nyitóoldal – főcím", "Egészség egy hosszú életre"],
    ["home.hero.lead", "home", "hero", "Nyitóoldal – alcím",
      "Orvosi állapotfelmérésre épülő longevity program személyre szabott kezelésekkel és modern diagnosztikával."],
    ["home.hero.cta.primary", "home", "hero", "Nyitóoldal – elsődleges gomb", "Időpontfoglalás"],
    ["home.hero.cta.secondary", "home", "hero", "Nyitóoldal – másodlagos gomb", "Mi az a Longevity?"],
    ["home.why.title", "home", "why", "Miért a V40Vital? – cím", "Miért a V40Vital?"],
    ["home.why.lead", "home", "why", "Miért a V40Vital? – bevezető",
      "Az egészségmegőrzés nálunk nem általános tanácsokból, hanem adatokra épülő orvosi döntésekből indul."],
    ["home.longevity.title", "home", "longevity", "Longevity szekció – cím", "Minden a longevity programról"],
    ["home.longevity.lead", "home", "longevity", "Longevity szekció – bevezető",
      "Nem trend, hanem hosszú távra épített orvosi szemlélet."],
    ["home.types.title", "home", "types", "Kezelés típusok – cím", "Kezelés típusok"],
    ["home.types.lead", "home", "types", "Kezelés típusok – bevezető",
      "Programjaink különböző egészségügyi célokra, panaszokra és élethelyzetekre kínálnak megoldást."],
    ["home.system.title", "home", "system", "Hogyan működik? – cím", "Hogyan működik?"],
    ["home.system.lead", "home", "system", "Hogyan működik? – bevezető",
      "Egy egészségprogram felépülése az első konzultációtól a kontrollig"],
    ["home.system.step1.title", "home", "system", "1. lépés – cím", "Első konzultáció"],
    ["home.system.step1.desc", "home", "system", "1. lépés – szöveg",
      "Megismerjük a panaszaidat, céljaidat és egészségi előzményeidet."],
    ["home.system.step2.title", "home", "system", "2. lépés – cím", "Állapotfelmérés"],
    ["home.system.step2.desc", "home", "system", "2. lépés – szöveg",
      "Laborvizsgálatokkal és diagnosztikai mérésekkel pontos képet kapunk a szervezeted aktuális állapotáról."],
    ["home.system.step3.title", "home", "system", "3. lépés – cím", "Személyre szabott terv"],
    ["home.system.step3.desc", "home", "system", "3. lépés – szöveg",
      "Az eredmények alapján orvosaink egyéni egészség- és longevity programot állítanak össze."],
    ["home.system.step4.title", "home", "system", "4. lépés – cím", "Célzott kezelések"],
    ["home.system.step4.desc", "home", "system", "4. lépés – szöveg",
      "Az állapotodhoz igazított kezelésekkel és javaslatokkal elkezdjük a személyre szabott programot."],
    ["home.system.step5.title", "home", "system", "5. lépés – cím", "Kontroll és követés"],
    ["home.system.step5.desc", "home", "system", "5. lépés – szöveg",
      "Az eredményeket rendszeresen nyomon követjük, és szükség esetén módosítjuk a programot."],
    ["home.system.cta", "home", "system", "GYIK gomb", "Irány a gyakran ismételt kérdések"],
    ["home.blogs.title", "home", "blogs", "Blog szekció – cím", "Legfrissebb írásaink"],
    ["home.blogs.lead", "home", "blogs", "Blog szekció – bevezető",
      "Friss cikkeinkben közérthetően írunk a longevityről, kezelésekről és egészségmegőrzésről."],
    ["home.doctors.title", "home", "doctors", "Orvosaink – cím", "Orvosaink"],
    ["home.doctors.lead", "home", "doctors", "Orvosaink – bevezető",
      "A V40Vital programjait tapasztalt orvosok állítják össze és kísérik végig"],
    ["home.social.title", "home", "social", "Közösségi szekció – cím", "Nézd meg online felületeinket!"],
    ["home.social.lead", "home", "social", "Közösségi szekció – bevezető",
      "Kövess minket friss hírekért, edukatív tartalmakért és gyakorlati tanácsokért"],
    ["cta.title", "global", "cta", "Alsó sáv – cím", "Foglalj időpontot kedvezménnyel!"],
    ["cta.lead", "global", "cta", "Alsó sáv – alcím",
      "Prémium állapotfelmérésre építünk, és személyre szabott kezelésekkel támogatjuk a céljaidat"],
    ["gyik.hero.title", "gyik", "hero", "GYIK oldal – főcím", "GYIK"],
    ["gyik.hero.lead", "gyik", "hero", "GYIK oldal – alcím",
      "Gyors válaszok a leggyakoribb kérdésekre, egy helyen."],
    ["gyik.q1.q", "gyik", "kerdes", "1. kérdés", "Hogyan tudok időpontot foglalni?"],
    ["gyik.q1.a", "gyik", "kerdes", "1. válasz",
      "Időpontot online, a weboldalunkon tudsz foglalni néhány kattintással. A foglalásról minden esetben visszaigazolást kapsz e-mailben, amely tartalmazza a vizsgálat pontos részleteit."],
    ["gyik.q2.q", "gyik", "kerdes", "2. kérdés", "Kell-e előzetes leletet vagy laboreredményt hoznom?"],
    ["gyik.q2.a", "gyik", "kerdes", "2. válasz",
      "Ez a választott kezeléstől függ, de ha van korábbi leleted vagy vizsgálati eredményed, mindenképpen érdemes magaddal hoznod. Ez segít szakembereinknek abban, hogy pontosabb és átfogóbb képet kapjanak az aktuális állapotodról."],
    ["gyik.q3.q", "gyik", "kerdes", "3. kérdés", "Lehet-e online konzultációt kérni?"],
    ["gyik.q3.a", "gyik", "kerdes", "3. válasz",
      "Igen, online konzultációra is van lehetőség. Időpont-egyeztetéshez kérjük, vedd fel velünk a kapcsolatot elérhetőségeinken, ahol a szakmai vezető segít a továbbiakban."],
    ["gyik.q4.q", "gyik", "kerdes", "4. kérdés", "Mi történik, ha nem nekem való az adott kezelés vagy program?"],
    ["gyik.q4.a", "gyik", "kerdes", "4. válasz",
      "A különböző programok és kezelések esetében előzetes egyeztetés szükséges. Ennek során segítünk eldönteni, hogy melyik irány a legmegfelelőbb számodra."],
    ["gyik.q5.q", "gyik", "kerdes", "5. kérdés", "Milyen fizetési lehetőségek vannak? Van lehetőség egészségpénztári elszámolásra?"],
    ["gyik.q5.a", "gyik", "kerdes", "5. válasz",
      "Online foglalás esetén bankkártyás fizetésre van lehetőség, a rendelőben pedig készpénzzel és bankkártyával is fizethetsz. Az egészségpénztári elszámolás lehetőségéről érdemes előre érdeklődni elérhetőségeinken, mivel ez szolgáltatásonként eltérhet."],
    ["gyik.q6.q", "gyik", "kerdes", "6. kérdés", "Mi a lemondási vagy módosítási feltétel?"],
    ["gyik.q6.a", "gyik", "kerdes", "6. válasz",
      "Az időpont a vizsgálat előtt legalább 24 órával lemondható vagy módosítható. 24 órán belüli lemondás esetén a szolgáltatás díjának 50%-a kerül felszámításra."],
    ["gyik.q7.q", "gyik", "kerdes", "7. kérdés", "Van parkolási lehetőség a közelben?"],
    ["gyik.q7.a", "gyik", "kerdes", "7. válasz",
      "A rendelő közvetlen környékén fizetős utcai parkolás érhető el. Mivel a belvárosi övezetben a szabad helyek száma változó, érdemes 10-15 perccel korábban érkezni, hogy kényelmesen találj parkolóhelyet."],
    ["cta.hours", "global", "cta", "Alsó sáv – nyitvatartás",
      "Hétfő – Péntek: 7:00 – 19:00\nSzombat: 8:00 – 12:00"],
    ["contact.phone", "global", "contact", "Telefonszám", "+36 20 459 2248"],
    ["contact.email", "global", "contact", "E-mail cím", "info@v40vital.hu"],
    ["contact.address", "global", "contact", "Cím", "Budapest, Visegrádi utca 40."],
    ["footer.about", "global", "footer", "Footer – bemutatkozó",
      "A hosszú élet önmagában nem elég. Mi az egészségesen, aktívan és jobb közérzettel megélt évekre fókuszálunk."],
    ["footer.links.title", "global", "footer", "Footer – linkek cím", "Linkek"],
    // --- Aloldali bannerek (fejléc + alcím) ---
    ["kezelesek.hero.title", "kezelesek", "hero", "Kezelések oldal – főcím", "Kezelések & Vizsgálatok"],
    ["kezelesek.hero.lead", "kezelesek", "hero", "Kezelések oldal – alcím",
      "Nem kell mindent előre tudnod. Segítünk megtalálni, mire van valóban szükséged."],
    ["rolunk.hero.title", "rolunk", "hero", "Rólunk oldal – főcím", "Rólunk"],
    ["rolunk.hero.lead", "rolunk", "hero", "Rólunk oldal – alcím",
      "Ismerd meg orvosainkat és rendelőnket, hogy tudd, milyen környezet és szakmai háttér vár nálunk."],
    ["rolunk.doctors.title", "rolunk", "torzs", "Orvosaink – cím", "Orvosaink"],
    ["rolunk.doctors.lead", "rolunk", "torzs", "Orvosaink – bevezető",
      "Orvosi csapatunk a szakmai precizitást, a személyes figyelmet és a hosszú távú egészség szemléletét képviseli."],
    ["rolunk.clinic.title", "rolunk", "torzs", "Rendelőnk – cím", "Rendelőnk"],
    ["rolunk.clinic.lead", "rolunk", "torzs", "Rendelőnk – bevezető",
      "Nyugodt, diszkrét környezetet alakítottunk ki, ahol a figyelem valóban rád irányul."],
    ["kapcsolat.hero.title", "kapcsolat", "hero", "Kapcsolat oldal – főcím", "Kapcsolat"],
    ["kapcsolat.hero.lead", "kapcsolat", "hero", "Kapcsolat oldal – alcím",
      "Bemutatjuk orvosainkat és rendelőinket, hogy már a kezelés előtt érezd: biztos kezekben leszel nálunk."],
    ["longevity.hero.title", "longevity", "hero", "Longevity oldal – főcím", "Mi az a Longevity?"],
    ["longevity.hero.lead", "longevity", "hero", "Longevity oldal – alcím",
      "A longevity programok, kezelések és a tudatos, hosszú távú egészségmegőrzés szakmai alapjai."],
    ["longevity.body.title", "longevity", "torzs", "Longevity törzs – cím", "Minden a longevity programról"],
    ["longevity.body.lead", "longevity", "torzs", "Longevity törzs – bevezető",
      "Minden, amit a longevity szemléletről és a program felépítéséről tudni érdemes."],
    ["longevity.body.card.title", "longevity", "torzs", "Longevity törzs – kártya cím", "Hogyan működik?"],
    ["longevity.body.card.text", "longevity", "torzs", "Longevity törzs – kártya szöveg",
      "A V40Vitalnál a longevity szemlélet azt jelenti, hogy nemcsak a már kialakult problémákat kezeljük, hanem a szervezet működését vizsgáljuk még azelőtt, hogy tünetek jelentkeznének. Programunk átfogó orvosi állapotfelmérésre és személyre szabott kezelési tervre épül. A modern diagnosztika, az infúziós terápiák és az életmód-optimalizáció együtt segítenek abban, hogy a szervezet hosszú távon is egyensúlyban működjön. Célunk nem csupán a betegségek megelőzése, hanem az is, hogy több energiával, jobb koncentrációval és stabil egészséggel élhess a mindennapokban."],
    ["longevity.body.point1", "longevity", "torzs", "Longevity pont 1", "Orvosi állapotfelmérés"],
    ["longevity.body.point2", "longevity", "torzs", "Longevity pont 2", "Személyre szabott longevity program"],
    ["longevity.body.point3", "longevity", "torzs", "Longevity pont 3", "Diagnosztikára épülő kezelési terv"],
    ["longevity.body.point4", "longevity", "torzs", "Longevity pont 4", "Kontroll és hosszú távú követés"],
    // --- Kapcsolat oldal törzse (Longevity2) ---
    ["kapcsolat.body.title", "kapcsolat", "torzs", "Kapcsolat törzs – cím", "Kezelés előtt"],
    ["kapcsolat.body.lead", "kapcsolat", "torzs", "Kapcsolat törzs – bevezető",
      "Nem trend, hanem hosszú távra épített orvosi szemlélet."],
    ["kapcsolat.body.card1.title", "kapcsolat", "torzs", "Kapcsolat kártya 1 – cím", "Mit hozzon magával?"],
    ["kapcsolat.body.card1.text", "kapcsolat", "torzs", "Kapcsolat kártya 1 – szöveg",
      "Infúziós kezelések esetén érdemes könyvet, laptopot vagy bármilyen eszközt hozni, amivel kényelmesen el tudja tölteni az időt a kezelés alatt. A folyamat nyugodt környezetben zajlik, így akár munkára vagy pihenésre is alkalmas. Konzultációra kérjük, hozza magával minden releváns korábbi leletét, vizsgálati eredményét vagy zárójelentését. Ez segít abban, hogy pontosabb képet kapjunk az állapotáról, és valóban személyre szabott javaslatot tudjunk adni."],
    ["kapcsolat.body.card2.title", "kapcsolat", "torzs", "Kapcsolat kártya 2 – cím", "Megközelítés"],
    ["kapcsolat.body.card2.text", "kapcsolat", "torzs", "Kapcsolat kártya 2 – szöveg",
      "A rendelő Budapest központi részén, a Visegrádi utca 40. szám alatt található, könnyen megközelíthető mind autóval, mind tömegközlekedéssel. A környéken több parkolási lehetőség is elérhető, jellemzően fizetős utcai parkolással. Tömegközlekedéssel érkezve a Nyugati tér és a 3-as metró (M3) pár perc sétára van, több villamos- és buszjárattal. Így a rendelő gyorsan és kényelmesen elérhető a város bármely pontjáról."],
  ];

  for (const [key, page, group, label, value] of content) {
    await prisma.contentBlock.upsert({
      where: { key_locale: { key, locale: "hu" } },
      update: {},
      create: { key, locale: "hu", page, group, label, value },
    });
  }

  // ---------------------------------------------------------------- SEO meta --
  const seo: Array<[string, string, string]> = [
    ["/", "V40 Vital – Longevity klinika Budapesten",
      "Orvosi állapotfelmérésre épülő longevity program, infúziós kezelések és személyre szabott egészségstratégia Budapest belvárosában."],
    ["/kezelesek", "Kezelések és árak | V40 Vital",
      "Infúziós terápiák, diagnosztikai csomagok és konzultáció. Online időpontfoglalás, bankkártyás fizetés."],
    ["/berletek", "Bérletek | V40 Vital",
      "Több alkalomra előre, kedvezőbb áron. Bérleteink érvényessége és felhasználási feltételei."],
    ["/longevity", "Mi az a longevity? | V40 Vital",
      "A longevity szemlélet a tünetek kezelése helyett a szervezet működését vizsgálja. Így épül fel a programunk."],
    ["/gyik", "Gyakran ismételt kérdések | V40 Vital",
      "Foglalás, lemondás, fizetés, egészségpénztári elszámolás – a leggyakoribb kérdések válaszokkal."],
    ["/kapcsolat", "Kapcsolat | V40 Vital",
      "Budapest, Visegrádi utca 40. Nyitvatartás, megközelítés és elérhetőségek."],
  ];

  for (const [path, title, description] of seo) {
    await prisma.seoMeta.upsert({
      where: { path_locale: { path, locale: "hu" } },
      update: {},
      create: { path, locale: "hu", title, description, ogTitle: title, ogDescription: description },
    });
  }

  console.log("Seed kész.");
  console.table({
    admin: ADMIN_EMAIL,
    szobák: rooms.length,
    "kezelés-típus": categories.length,
    kezelés: services.length,
    szakember: practitioners.length,
    bérlet: passes.length,
    szövegblokk: content.length,
    "SEO bejegyzés": seo.length,
  });
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
