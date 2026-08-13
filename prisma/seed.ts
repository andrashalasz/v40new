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
      update: { shortDesc: c.shortDesc, longDesc: c.longDesc },
      create: { ...c, sortOrder: i },
    });
    catMap[c.slug] = row.id;
  }

  // -------------------------------------------------------------- kezelések --
  // A magán egészségügyi szolgáltatás áfamentes (Áfa tv. 85. §), az esztétikai
  // jellegű kezelés viszont jellemzően 27%-os – ezért van kezelés-szintű áfa.
  const services = [
    { slug: "nad-energy", title: "NAD+ Energy Infúzió", cat: "infuzios-kezelesek",
      priceGross: 145000, vatRate: 0, durationMin: 90, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Sejtszintű energiatermelés támogatása NAD+ prekurzorokkal, orvosi felügyelet mellett." },
    { slug: "powerfuel", title: "Powerfuel Sport Regeneráció", cat: "infuzios-kezelesek",
      priceGross: 119000, vatRate: 0, durationMin: 75, bufferBeforeMin: 10, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 90, rooms: ["Infúziós szoba A", "Infúziós szoba B"],
      desc: "Aminosav- és elektrolitpótlás intenzív edzésterhelés vagy verseny után." },
    { slug: "radiance", title: "Radiance Bőrfiatalítás", cat: null,
      priceGross: 89000, vatRate: 27, durationMin: 60, bufferBeforeMin: 0, bufferAfterMin: 15,
      minLeadTimeHours: 24, maxLeadTimeDays: 60, rooms: ["Kezelő"],
      desc: "Kombinált antioxidáns és kollagén-stimuláló protokoll. Esztétikai kezelés, 27% áfával." },
    { slug: "cardiofit", title: "CardioFit Állapotfelmérés", cat: "diagnosztika",
      priceGross: 65000, vatRate: 0, durationMin: 45, bufferBeforeMin: 0, bufferAfterMin: 10,
      minLeadTimeHours: 48, maxLeadTimeDays: 90, rooms: ["Vizsgáló"],
      desc: "Kardiovaszkuláris terhelési vizsgálat és laborpanel, orvosi kiértékeléssel." },
    { slug: "femina-hormon-panel", title: "Femina Hormon Panel", cat: "diagnosztika",
      priceGross: 98000, vatRate: 0, durationMin: 60, bufferBeforeMin: 0, bufferAfterMin: 10,
      minLeadTimeHours: 48, maxLeadTimeDays: 90, rooms: ["Vizsgáló"], gender: "Női",
      desc: "Női hormonprofil teljes körű vizsgálata, endokrinológiai konzultációval." },
    { slug: "signature-konzultacio", title: "Signature Longevity Konzultáció", cat: "konzultacio",
      priceGross: 45000, vatRate: 0, durationMin: 30, bufferBeforeMin: 0, bufferAfterMin: 5,
      minLeadTimeHours: 12, maxLeadTimeDays: 90, rooms: ["Vizsgáló"],
      desc: "Első orvosi beszélgetés, célkitűzés és a személyre szabott program összeállítása." },
  ];

  const svcMap: Record<string, number> = {};
  for (const [i, s] of services.entries()) {
    const { cat, rooms: roomList, ...rest } = s;
    const row = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
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

  // ------------------------------------------------------------ szakemberek --
  const practitioners = [
    { slug: "dr-vertes-anna", name: "Dr. Vértes Anna", titles: "Dr.",
      category: "belgyógyász, longevity szakértő",
      desc: "Több mint 15 év belgyógyászati tapasztalattal a metabolikus egészség és a hormonális egyensúly területén.",
      hours: { 1: [[H(9), H(13)], [H(14), H(19)]], 2: [[H(9), H(19)]], 4: [[H(9), H(19)]], 5: [[H(9), H(17)]] },
      services: ["nad-energy", "powerfuel", "femina-hormon-panel", "signature-konzultacio"] },
    { slug: "dr-szabo-gabor", name: "Dr. Szabó Gábor", titles: "Dr.",
      category: "kardiológus",
      desc: "Kardiovaszkuláris prevencióval és terheléses diagnosztikával foglalkozik.",
      hours: { 1: [[H(10), H(17)]], 3: [[H(10), H(19)]], 4: [[H(10), H(17)]], 5: [[H(10), H(17)]], 6: [[H(8), H(12)]] },
      services: ["cardiofit", "signature-konzultacio"] },
    { slug: "dr-gajer-peter", name: "Dr. Gájer Péter", titles: "Dr.",
      category: "sportorvos",
      desc: "Teljesítmény-optimalizálás és regenerációs protokollok versenysportolóknak és amatőröknek.",
      hours: { 1: [[H(8), H(15)]], 2: [[H(8), H(15)]], 3: [[H(8), H(15)]], 5: [[H(8), H(13)]] },
      services: ["powerfuel", "cardiofit", "signature-konzultacio"] },
  ];

  for (const p of practitioners) {
    const { hours, services: svcList, ...rest } = p;
    const row = await prisma.practitioner.upsert({
      where: { slug: p.slug },
      update: {},
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

  // ---------------------------------------------------------------- bérletek --
  const passes = [
    { slug: "nad-berlet-5", title: "NAD+ Bérlet – 5 alkalom", priceGross: 620000, vatRate: 0,
      sessionCount: 5, validityDays: 180, services: ["nad-energy"],
      desc: "Öt alkalom NAD+ Energy infúzióra, a vásárlástól számított 180 napon belül." },
    { slug: "infuzios-berlet-10", title: "Infúziós Bérlet – 10 alkalom", priceGross: 1090000, vatRate: 0,
      sessionCount: 10, validityDays: 365, services: ["nad-energy", "powerfuel"],
      desc: "Tíz alkalom, szabadon felhasználva a NAD+ Energy és a Powerfuel kezelésekre." },
    { slug: "radiance-berlet-3", title: "Radiance Bérlet – 3 alkalom", priceGross: 240000, vatRate: 27,
      sessionCount: 3, validityDays: 120, services: ["radiance"],
      desc: "Három alkalom Radiance bőrfiatalításra. Esztétikai szolgáltatás, 27% áfával." },
  ];

  for (const [i, p] of passes.entries()) {
    const { services: svcList, ...rest } = p;
    const row = await prisma.passTemplate.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...rest, vatExemptReason: p.vatRate === 0 ? TAM : null, sortOrder: i },
    });
    for (const sl of svcList) {
      await prisma.passTemplateService.upsert({
        where: { passTemplateId_serviceId: { passTemplateId: row.id, serviceId: svcMap[sl] } },
        update: {},
        create: { passTemplateId: row.id, serviceId: svcMap[sl] },
      });
    }
  }

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
    ["home.blogs.title", "home", "blogs", "Blog szekció – cím", "Legfrissebb írásaink"],
    ["home.doctors.title", "home", "doctors", "Orvosaink – cím", "Orvosaink"],
    ["home.social.title", "home", "social", "Közösségi szekció – cím", "Nézd meg online felületeinket!"],
    ["cta.title", "global", "cta", "Alsó sáv – cím", "Foglalj időpontot kedvezménnyel!"],
    ["cta.hours", "global", "cta", "Alsó sáv – nyitvatartás",
      "Hétfő – Péntek: 7:00 – 19:00\nSzombat: 8:00 – 12:00"],
    ["contact.phone", "global", "contact", "Telefonszám", "+36 20 459 2248"],
    ["contact.email", "global", "contact", "E-mail cím", "info@v40vital.hu"],
    ["contact.address", "global", "contact", "Cím", "Budapest, Visegrádi utca 40."],
    ["footer.about", "global", "footer", "Footer – bemutatkozó",
      "A hosszú élet önmagában nem elég. Mi az egészségesen, aktívan és jobb közérzettel megélt évekre fókuszálunk."],
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
