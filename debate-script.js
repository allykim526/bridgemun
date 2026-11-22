/* =====================================================================
   debate-script.js — the written debate

   What this file does:
   Holds the actual words of one full committee debate on "Digital
   Inclusion for Older Persons" — a chair's opening, one opening speech
   per delegation, a proposed clause, a question, and an answer, in the
   order a real committee session would follow them.

   This is written in advance, the same way the AI delegate's opening
   speech in board.js is written in advance — there is no live AI
   generating these words. debate.js only decides which of these lines
   to play (based on which delegations the user picked) and how to
   speak them out loud.

   Every line carries three versions of the same words:
     formal      — full diplomatic language, for delegates comfortable
                   with MUN-style speech
     simple      — the same point in short, plain English, for anyone
                   less familiar with English or with MUN's usual style
     translations — the same point in other languages, shown only when
                   a viewer clicks a caption to ask for it, in whichever
                   language they picked on the setup screen. Korean,
                   Spanish, and Chinese are written out for now; more
                   languages can be added by adding another key to a
                   line's "translations" (and a matching entry in
                   LANGUAGE_NAMES below) — debate.js reads whichever
                   language codes actually exist here, so nothing else
                   needs to change to add one.
===================================================================== */

export const DEBATE_TOPIC =
  "Digital Inclusion for Older Persons in an Increasingly Digital Society";

/* Every delegation this debate script knows how to play. A country not
   in this list simply cannot be selected in the setup screen. */
export const DEBATE_PARTICIPANTS = [
  { country: "Republic of Korea", flag: "🇰🇷" },
  { country: "Singapore", flag: "🇸🇬" },
  { country: "United Kingdom", flag: "🇬🇧" }
];

/* THE FOCUS TOPIC — the SDG problem this whole platform's debate is
   about, written up from the BridgeMUN SDG Content Task research. It is
   shown in the debate simulator's "Issue Brief" panel and is meant to be
   the single place this framing lives. */
export const DEBATE_SDG = {
  goal: "SDG 10 — Reduced inequality within and among countries",
  target: "Target 10.2 — promote social, economic, and political inclusion regardless of characteristics including age"
};

export const ISSUE_BRIEF = {
  focus:
    "Digital disparities among older persons — especially their lack of " +
    "access to, and knowledge of, basic technology and how to use it.",

  affected: [
    "Older people are the most affected. In a world where technology is " +
    "developing rapidly, not having access to it, or not knowing how to " +
    "use it, is a huge disadvantage. Many of the elderly cannot use " +
    "seemingly sophisticated machines such as kiosks or functions on " +
    "phones, which keeps them from social interactions and from feeling " +
    "connected to their community. This is more prevalent among " +
    "low-income populations, who often lack access to modern hardware.",

    "The digital divide also leaves the elderly more isolated and with " +
    "fewer healthcare opportunities, since it stops them from using " +
    "modern online health tools. It also contributes to an increase in " +
    "“lonely deaths”, where people who live alone, especially the " +
    "elderly, die at home and remain undiscovered for a long time."
  ],

  fact: {
    text:
      "“Kodokushi” is the Japanese term for people dying alone and " +
      "remaining undiscovered; in Korea the same phenomenon is called " +
      "“고독사”. Both countries have aging societies with large elderly " +
      "populations, so the numbers rise every year. South Korea's " +
      "Ministry of Health and Welfare recorded 3,924 lonely deaths in " +
      "2024, up 7.2%. This is linked to the digital divide, since a lack " +
      "of technological access keeps these individuals from connecting " +
      "with their family and feeling like part of a community.",
    source: "imalive.co, as cited in the research"
  }
};

/* Each researched delegation's position, in the researcher's own words:
   what it wants the international community to do, the red line it
   protects, its one-sentence position, and the sources behind it. The
   keys match the country names in DEBATE_PARTICIPANTS. */
export const COUNTRY_BRIEFS = {
  "Republic of Korea": {
    wants: [
      "Wants the international community to emphasize practical digital " +
      "inclusion and treat it as a significant issue. Other countries " +
      "might not be critically affected by lonely deaths, but digital " +
      "disparities exist in every community, and that is a concern the " +
      "international community must address together. Having already " +
      "experienced the outcomes of a digital divide with an elderly " +
      "population, South Korea can also act as a guide and overseer in " +
      "some matters.",

      "Believes there should be international digital-inclusion policies " +
      "and technologies along with accessible digital-literacy programs, " +
      "and wants companies encouraged to build universal design into " +
      "websites, kiosks, and emerging technologies. It will probably also " +
      "suggest that countries reduce social stigma against older persons " +
      "and find ways to include them effectively. In 2025, Korea hosted " +
      "an APEC policy workshop on digital inclusion for older adults in " +
      "Incheon, showing its interest in regional cooperation."
    ],
    redLine:
      "Would advocate against a one-size-fits-all technological or " +
      "educational model for every country, and for a more holistic " +
      "approach, since the causes of the problem and its effects differ " +
      "from country to country.",
    position:
      "The delegation of South Korea believes that the ongoing digital " +
      "development must benefit citizens of all generations and therefore " +
      "calls for international cooperation on accessible digital design, " +
      "digital-literacy education, and the exchange of best practices " +
      "among nations.",
    sources: [
      "https://www.apec.org/press/news-releases/2025/digital-inclusion-for-the-elderly-takes-center-stage-in-regional-dialogue",
      "https://it.chosun.com/news/articleView.html?idxno=2023092168667",
      "https://www.chosun.com/national/welfare-medical/2025/11/27/JQRWUPJJU5FXLHIXUK6BC65HDM/"
    ]
  },

  "Singapore": {
    wants: [
      "Also wants the international community to emphasize practical " +
      "digital inclusion, which Singapore is already doing. Through its " +
      "Senior Go Digital programme it gives the elderly education and " +
      "training on smartphone use and online communication, with Digital " +
      "Ambassadors helping locally. It therefore advocates one-on-one " +
      "assistance rather than relying on online instruction, which is " +
      "often inaccessible to the elderly."
    ],
    redLine:
      "Would oppose approaches that assume digital inclusion can be " +
      "solved with simple measures like handing out devices or expanding " +
      "infrastructure. What matters most is making older people actually " +
      "feel like citizens, able to use devices and technologies safely " +
      "and confidently.",
    position:
      "The delegation of Singapore believes that practical digital " +
      "inclusion requires more than internet connectivity and calls upon " +
      "Member States to combine affordable access with practical digital " +
      "education, including community-based assistance so that the " +
      "elderly can independently participate in a digital society.",
    sources: [
      "https://www.imda.gov.sg/how-we-can-help/seniors-go-digital",
      "https://centreforpublicimpact.org/resource-hub/lessons-on-digital-equity-how-the-singapore-government-has-been-tackling-the-digital-divide/",
      "https://www.engineeringgood.org/news/the-new-dimension-of-singapores-digital-divide",
      "https://www.caritas-singapore.org/crossing-the-digital-divide/"
    ]
  },

  "United Kingdom": {
    wants: [
      "Wants the international community to support a broad approach " +
      "that addresses the multiple causes of digital exclusion. Its own " +
      "Digital Inclusion Action Plan identifies older people as one of " +
      "the main groups vulnerable to digital exclusion, and stresses " +
      "four areas: improving digital skills, increasing access to " +
      "devices and internet connectivity, making online services easier " +
      "to use while keeping offline options, and providing trusted " +
      "local support."
    ],
    redLine:
      "Will likely resist the assumption that every service should " +
      "become digital, as shown by its emphasis on keeping accessible " +
      "offline options. Digital inclusion should let people participate " +
      "online, but citizens who cannot use digital systems should not " +
      "automatically lose access to essential services.",
    position:
      "The delegation of the United Kingdom believes that digital " +
      "development must not deepen existing social inequalities by " +
      "maintaining affordable access, but it must also ensure that " +
      "essential services remain accessible to individuals who cannot " +
      "participate fully online.",
    sources: [
      "https://sdgs.un.org/goals",
      "https://www.gov.uk/government/publications/digital-inclusion-action-plan-one-year-on/digital-inclusion-action-plan-one-year-on",
      "https://www.goodthingsfoundation.org/discover/digital-inclusion-insights/digital-inclusion-insights-2026/one-year-on-action-plan"
    ]
  }
};

/* HOW AI DELEGATES VOTE. No AI service is called (that would cost money),
   so an AI delegate decides by matching the words of what is being voted
   on against what its country's research says it supports and where its
   red lines are. "supports" are phrases that fit its position; "opposes"
   are phrases that cross a red line (and weigh double). The vote is shown
   together with the phrases that decided it, so it is always explainable.
   Phrases are matched in lower case, anywhere in the text. A country with
   no researched position uses DEFAULT_VOTING_PROFILE. */
export const VOTING_PROFILES = {
  "Republic of Korea": {
    supports: ["digital inclusion", "digital literacy", "literacy", "universal design",
               "age-inclusive", "best practices", "guidelines", "cooperation",
               "accessible", "exchange", "knowledge", "independent"],
    opposes:  ["one-size", "one size", "mandatory", "uniform"]
  },
  "Singapore": {
    supports: ["one-on-one", "community", "ambassador", "practical", "training",
               "assistance", "hands-on", "confidence", "literacy", "independent",
               "affordable", "local support"],
    opposes:  ["devices only", "infrastructure only", "distribute devices",
               "connectivity alone", "online-only", "online only"]
  },
  "United Kingdom": {
    supports: ["offline", "essential services", "trusted", "local", "affordable",
               "alternative", "skills", "safety net", "remain accessible",
               "in person", "telephone"],
    opposes:  ["digital-only", "digital only", "online-only", "online only",
               "replace offline", "abolish", "phase out offline", "mandatory online"]
  }
};

export const DEFAULT_VOTING_PROFILE = {
  supports: ["inclusion", "older", "access", "literacy", "support", "cooperation", "accessible", "training"],
  opposes:  ["ban ", "penalt", "sanction", "punish"]
};

/* Motions the scripted AI delegates can raise during the debate. Like
   every other line here these are written in advance — no AI service
   writes them, so raising one costs nothing. Each is raised by one
   delegation, and only if that delegation is in the debate. A motion
   that passes is recorded in the meeting log; this simulator does not
   act on it (it does not actually start a caucus or change a speaking
   time). */
export const AI_MOTIONS = [
  {
    country: "Singapore",
    text: "Motion to extend each remaining delegation's speaking time to 90 seconds."
  },
  {
    country: "United Kingdom",
    text: "Motion for a 5-minute moderated caucus on keeping offline services available."
  },
  {
    country: "Republic of Korea",
    text: "Motion for a 3-minute recess so delegations can consult."
  },
  {
    country: "Singapore",
    text: "Motion to move into an unmoderated caucus to merge draft resolutions."
  },
  {
    country: "United Kingdom",
    text: "Motion to move into voting procedure on the draft resolution."
  }
];

/* The full name shown in the setup screen's language picker for each
   translation code used anywhere in DEBATE_SCRIPT below. */
export const LANGUAGE_NAMES = {
  ko: "Korean",
  es: "Spanish",
  zh: "Chinese"
};

/* One entry per moment in the debate, in the order they are spoken.
   "country" is null for the Chair, who is not one of the delegations a
   user picks — the Chair always speaks. Every other line is skipped by
   debate.js unless its "country" was selected in the setup screen. */
export const DEBATE_SCRIPT = [
  {
    kind: "chair",
    speaker: "Chair",
    country: null,
    flag: "🔔",
    label: "Call to Order",
    formal:
      "This committee is called to order. Today's agenda item concerns " +
      "digital inclusion for older persons — how societies can ensure " +
      "that rapid technological change does not leave any generation " +
      "behind. The Chair recognizes the delegation of the Republic of " +
      "Korea to deliver the first opening statement.",
    simple:
      "Let's begin. Today we are talking about older people and digital " +
      "technology. Some technology helps people, but some people get " +
      "left behind. First, we will hear from South Korea.",
    translations: {
      ko:
        "본 위원회의 개회를 선언합니다. 오늘의 안건은 노년층을 위한 디지털 " +
        "포용성입니다 — 급속한 기술 발전이 어떤 세대도 소외시키지 않도록 " +
        "하는 방법을 논의합니다. 의장은 대한민국 대표단에게 첫 번째 " +
        "개회 연설을 요청합니다.",
      es:
        "Se declara abierta la sesión de este comité. El tema de la " +
        "agenda de hoy es la inclusión digital de las personas " +
        "mayores: cómo pueden las sociedades garantizar que el rápido " +
        "cambio tecnológico no deje atrás a ninguna generación. La " +
        "Presidencia concede la palabra a la delegación de la " +
        "República de Corea para el primer discurso de apertura.",
      zh:
        "本委员会现在开始。今天的议程是老年人的数字包容问题——各国社会" +
        "应如何确保快速的技术变革不会让任何一代人掉队。主席现在请大韩" +
        "民国代表团发表第一份开幕陈述。"
    }
  },

  {
    kind: "speech",
    speaker: "Republic of Korea",
    country: "Republic of Korea",
    flag: "🇰🇷",
    label: "Opening Statement",
    formal:
      "Technology has simply changed the world. From smartphones to " +
      "artificial intelligence, it is quite easy to view this digital " +
      "leap as a positive phenomenon that allows everyone to engage " +
      "more interactively with the environment around us. The truth " +
      "is, that's only for some.\n\n" +
      "Honorable chairs, fellow delegates, and most esteemed guests, " +
      "the delegate of South Korea would like to share what is being " +
      "forgotten by most of the world — the digital divide. " +
      "Governments promise to connect societies and make lives easier " +
      "for all, while millions of older persons risk being " +
      "disconnected with society because of their lack of access to " +
      "digital devices and information. The Republic of Korea, as a " +
      "nation officially classified as a \"super-aged\" society, " +
      "believes that it is crucial to expand accessible digital " +
      "education and promote age-inclusive design standards. Korea " +
      "has already pursued this principle through digital education " +
      "and a comprehensive Digital Inclusion Act. This delegate calls " +
      "upon the committee for collective efforts to be made to ensure " +
      "that no generation is left behind in a digitally advancing " +
      "world.",
    simple:
      "Technology is changing fast. Phones and computers help many " +
      "people. But some people are left out — especially older people " +
      "who do not have access to technology. South Korea has many " +
      "older citizens, so we know this problem well. We believe every " +
      "country should teach older people how to use technology, and " +
      "make phones, websites, and machines easier for them to use. " +
      "South Korea already does this. We ask everyone to work " +
      "together so no one is left behind.",
    translations: {
      ko:
        "기술은 세상을 완전히 바꾸어 놓았습니다. 스마트폰부터 " +
        "인공지능까지, 이러한 디지털 도약을 우리 주변 환경과 더 " +
        "상호작용적으로 소통하게 해주는 긍정적인 현상으로 보기 " +
        "쉽습니다. 하지만 사실은, 그것은 일부에게만 해당됩니다.\n\n" +
        "존경하는 의장님, 그리고 대표 여러분, 대한민국 대표는 세계 " +
        "대부분이 잊고 있는 것 — 바로 디지털 격차에 대해 말씀드리고자 " +
        "합니다. 각국 정부는 사회를 연결하고 모두의 삶을 더 편리하게 " +
        "만들겠다고 약속하지만, 수백만 명의 노년층은 디지털 기기와 " +
        "정보에 대한 접근 부족으로 사회로부터 단절될 위기에 처해 " +
        "있습니다. '초고령 사회'로 공식 분류된 대한민국은 접근 가능한 " +
        "디지털 교육을 확대하고 연령 포용적 디자인 기준을 촉진하는 " +
        "것이 매우 중요하다고 믿습니다. 한국은 이미 디지털 교육과 " +
        "포괄적인 디지털 포용법을 통해 이 원칙을 추진해 왔습니다. 본 " +
        "대표는 디지털 시대에 어떤 세대도 소외되지 않도록 위원회의 " +
        "공동 노력을 촉구합니다.",
      es:
        "La tecnología, simplemente, ha cambiado el mundo. Desde los " +
        "teléfonos inteligentes hasta la inteligencia artificial, es " +
        "fácil ver este salto digital como un fenómeno positivo que " +
        "permite a todos interactuar más plenamente con el entorno " +
        "que nos rodea. La verdad es que eso solo es cierto para " +
        "algunos.\n\n" +
        "Honorable Presidencia, distinguidos delegados y estimados " +
        "invitados, la delegación de Corea del Sur desea señalar lo " +
        "que la mayor parte del mundo está olvidando: la brecha " +
        "digital. Los gobiernos prometen conectar a las sociedades y " +
        "facilitar la vida de todos, mientras millones de personas " +
        "mayores corren el riesgo de quedar desconectadas de la " +
        "sociedad por falta de acceso a dispositivos digitales e " +
        "información. La República de Corea, clasificada oficialmente " +
        "como una sociedad \"superenvejecida\", considera crucial " +
        "ampliar la educación digital accesible y promover normas de " +
        "diseño inclusivas para todas las edades. Corea ya ha llevado " +
        "a la práctica este principio mediante la educación digital y " +
        "una Ley integral de Inclusión Digital. Esta delegación hace " +
        "un llamado al comité para que se realicen esfuerzos " +
        "colectivos que garanticen que ninguna generación quede " +
        "atrás en un mundo digitalmente avanzado.",
      zh:
        "科技彻底改变了世界。从智能手机到人工智能,人们很容易把这种" +
        "数字飞跃视为一种积极现象,让每个人都能更充分地与周围环境互" +
        "动。但事实是,这只对一部分人成立。\n\n" +
        "尊敬的主席,各位代表,以及尊敬的来宾们,大韩民国代表希望提" +
        "出一个被世界大多数人忽视的问题——数字鸿沟。各国政府承诺连" +
        "接社会、让所有人生活更便利,而数百万老年人却因缺乏获取数字" +
        "设备和信息的机会,面临与社会脱节的风险。大韩民国作为一个被" +
        "正式列为\"超高龄化\"的国家,认为扩大普惠性数字教育、推广适" +
        "老化设计标准至关重要。韩国已经通过数字教育和全面的《数字包" +
        "容法》践行这一原则。本代表呼吁委员会共同努力,确保在数字化" +
        "不断发展的世界中,不让任何一代人掉队。"
    }
  },

  {
    kind: "speech",
    speaker: "Singapore",
    country: "Singapore",
    flag: "🇸🇬",
    label: "Opening Statement",
    formal:
      "Mister Chair, fellow delegates, the delegation of Singapore " +
      "rises to affirm that digital inclusion cannot rest on " +
      "connectivity alone. An older citizen handed a smartphone " +
      "without guidance remains as excluded as one with no device at " +
      "all. Singapore's Senior Go Digital movement, delivered by " +
      "community Digital Ambassadors, has shown that patient, " +
      "one-on-one instruction succeeds where generic online tutorials " +
      "fail — precisely because those tutorials cannot reach the " +
      "audience that needs them most. We therefore urge this " +
      "committee to look beyond infrastructure targets and invest in " +
      "trusted, local, human support, so that every senior citizen " +
      "may use technology not with hesitation, but with genuine " +
      "confidence and dignity.",
    simple:
      "Just giving someone a phone is not enough. If nobody teaches " +
      "them how to use it, they are still left out. In Singapore, we " +
      "send helpers called \"Digital Ambassadors\" to teach older " +
      "people one-on-one. This works better than online lessons " +
      "alone. We ask other countries to also give real human help, " +
      "not just internet access, so older people can feel safe and " +
      "confident using technology.",
    translations: {
      ko:
        "의장님, 그리고 대표 여러분, 싱가포르 대표단은 디지털 포용이 " +
        "단순한 연결성만으로는 이루어질 수 없다는 점을 강조하고자 " +
        "합니다. 안내 없이 스마트폰을 건네받은 노인은 기기가 아예 없는 " +
        "사람만큼이나 소외된 상태입니다. 싱가포르의 '시니어 고 디지털' " +
        "운동은 지역사회의 '디지털 앰버서더'를 통해, 일반적인 온라인 " +
        "강의가 정작 필요한 대상에게 닿지 못하는 상황에서, 인내심 있는 " +
        "일대일 지도가 성공적임을 보여주었습니다. 따라서 본 위원회가 " +
        "인프라 목표를 넘어, 신뢰할 수 있는 지역 기반의 인적 지원에 " +
        "투자할 것을 촉구합니다. 그래야 모든 노인이 망설임이 아닌 " +
        "진정한 자신감과 존엄성을 가지고 기술을 사용할 수 있을 " +
        "것입니다.",
      es:
        "Señor Presidente, distinguidos delegados, la delegación de " +
        "Singapur se levanta para afirmar que la inclusión digital no " +
        "puede basarse únicamente en la conectividad. Un ciudadano " +
        "mayor al que se le entrega un teléfono inteligente sin " +
        "orientación sigue tan excluido como quien no tiene ningún " +
        "dispositivo. El movimiento Senior Go Digital de Singapur, " +
        "impulsado por Embajadores Digitales comunitarios, ha " +
        "demostrado que la instrucción individual y paciente tiene " +
        "éxito donde los tutoriales genéricos en línea fracasan, " +
        "precisamente porque estos no llegan a quienes más los " +
        "necesitan. Por ello, instamos a este comité a mirar más allá " +
        "de las metas de infraestructura e invertir en apoyo humano, " +
        "local y de confianza, para que cada persona mayor pueda usar " +
        "la tecnología no con vacilación, sino con verdadera " +
        "confianza y dignidad.",
      zh:
        "主席先生,各位代表,新加坡代表团愿意强调,数字包容不能仅仅" +
        "依靠网络连接。如果没有指导就把智能手机交给一位老年人,他们" +
        "依然会被排斥在外,与完全没有设备的人无异。新加坡的\"乐龄" +
        "@云端\"(Senior Go Digital)计划通过社区\"数字大使\"提供帮助," +
        "证明了耐心的一对一指导比通用的在线教程更为有效——正因为这" +
        "些教程恰恰无法触及最需要帮助的人群。因此,我们敦促本委员会" +
        "不要止步于基础设施目标,而应投资于可信赖的本地人力支持,让" +
        "每一位老年公民都能带着真正的自信与尊严使用科技,而不是心存" +
        "犹豫。"
    }
  },

  {
    kind: "speech",
    speaker: "United Kingdom",
    country: "United Kingdom",
    flag: "🇬🇧",
    label: "Opening Statement",
    formal:
      "Mister Chair, distinguished delegates, the United Kingdom " +
      "welcomes this discussion but cautions against treating " +
      "digitalisation as an unqualified good. Our own Digital " +
      "Inclusion Action Plan identifies four priorities: stronger " +
      "digital skills, wider access to devices and connectivity, " +
      "services that remain simple to use, and support delivered by " +
      "people citizens already trust. Yet we must be equally clear " +
      "about a red line: no citizen should lose access to a pension, " +
      "a hospital appointment, or a benefit merely because a service " +
      "moved online. The United Kingdom calls on this committee to " +
      "pursue digital progress that runs alongside, not instead of, " +
      "reliable offline alternatives for those who need them.",
    simple:
      "We agree this is important, but we have one big worry. Not " +
      "every service should move online. Our plan has four parts: " +
      "teach digital skills, give access to devices and internet, " +
      "make websites easier to use, and give trusted local help. But " +
      "some people cannot use the internet at all. They should still " +
      "be able to get their pension, see a doctor, or get help — even " +
      "without the internet.",
    translations: {
      ko:
        "의장님, 그리고 존경하는 대표 여러분, 영국은 이번 논의를 " +
        "환영하지만, 디지털화를 무조건적인 선으로 여기는 것에 대해 " +
        "경계하고자 합니다. 영국의 '디지털 포용 실행 계획'은 네 가지 " +
        "우선순위를 제시합니다: 디지털 역량 강화, 기기 및 인터넷 " +
        "접근성 확대, 이용하기 쉬운 서비스, 그리고 시민이 이미 " +
        "신뢰하는 사람들을 통한 지원입니다. 그러나 분명한 한 가지 " +
        "원칙이 있습니다: 어떤 시민도 서비스가 온라인으로 전환되었다는 " +
        "이유만으로 연금, 병원 예약, 또는 복지 혜택에 대한 접근을 " +
        "잃어서는 안 됩니다. 영국은 본 위원회가 디지털 발전을 오프라인 " +
        "대안을 대체하는 것이 아니라, 그것이 필요한 이들을 위해 함께 " +
        "병행하는 방식으로 추진할 것을 촉구합니다.",
      es:
        "Señor Presidente, distinguidos delegados, el Reino Unido " +
        "celebra este debate, pero advierte contra tratar la " +
        "digitalización como un bien incondicional. Nuestro propio " +
        "Plan de Acción para la Inclusión Digital identifica cuatro " +
        "prioridades: mayores competencias digitales, más amplio " +
        "acceso a dispositivos y conectividad, servicios que sigan " +
        "siendo fáciles de usar, y apoyo prestado por personas en " +
        "quienes los ciudadanos ya confían. Sin embargo, debemos ser " +
        "igualmente claros respecto a una línea roja: ningún " +
        "ciudadano debería perder el acceso a una pensión, a una " +
        "cita médica o a una prestación simplemente porque un " +
        "servicio pasó a ser digital. El Reino Unido pide a este " +
        "comité que impulse un progreso digital que acompañe, y no " +
        "sustituya, alternativas fuera de línea confiables para " +
        "quienes las necesiten.",
      zh:
        "主席先生,各位代表,英国欢迎这场讨论,但提醒大家不要把数字" +
        "化视为无条件的善举。我们自己的《数字包容行动计划》确定了四" +
        "个优先事项:提升数字技能、扩大设备与网络接入、保持服务的易" +
        "用性,以及由公民已经信任的人提供支持。但我们必须同样明确一" +
        "条底线:任何公民都不应仅仅因为某项服务转为线上,就失去获得" +
        "养老金、医院预约或福利的机会。英国呼吁本委员会推动的数字化" +
        "进步,应当与可靠的线下替代方案并行,而不是取而代之,尤其是" +
        "为那些真正需要它们的人。"
    }
  },

  {
    kind: "clause",
    speaker: "Republic of Korea",
    country: "Republic of Korea",
    flag: "🇰🇷",
    label: "Proposed Operative Clause",
    formal:
      "Encourages the International Telecommunication Union to " +
      "collaborate with Member States, technology companies, and " +
      "civil-society organisations to develop voluntary guidelines " +
      "for age-inclusive digital services and establish a knowledge " +
      "and experience-sharing platform where Member States can " +
      "exchange digital literacy curricula, standards, and models, " +
      "strengthening older persons' ability to participate " +
      "independently in increasingly digital societies.",
    simple:
      "We ask the International Telecommunication Union to work with " +
      "countries, companies, and community groups to make " +
      "easy-to-follow guidelines for older people using technology. " +
      "We also ask for a shared space where countries can share " +
      "ideas, teaching plans, and lessons learned, so older people " +
      "everywhere can use technology on their own.",
    translations: {
      ko:
        "국제전기통신연합(ITU)이 회원국, 기술 기업, 시민사회 단체와 " +
        "협력하여 연령 포용적 디지털 서비스에 대한 자발적 가이드라인을 " +
        "개발하고, 회원국들이 디지털 문해력 커리큘럼, 표준, 모델을 " +
        "교류할 수 있는 지식·경험 공유 플랫폼을 구축함으로써, 노년층이 " +
        "점차 디지털화되는 사회에서 독립적으로 참여할 수 있는 역량을 " +
        "강화할 것을 권장한다.",
      es:
        "Alienta a la Unión Internacional de Telecomunicaciones a " +
        "colaborar con los Estados Miembros, las empresas " +
        "tecnológicas y las organizaciones de la sociedad civil para " +
        "elaborar directrices voluntarias sobre servicios digitales " +
        "inclusivos para todas las edades, y a establecer una " +
        "plataforma de intercambio de conocimientos y experiencias " +
        "donde los Estados Miembros puedan compartir planes de " +
        "estudio, normas y modelos de alfabetización digital, " +
        "fortaleciendo la capacidad de las personas mayores para " +
        "participar de manera independiente en sociedades cada vez " +
        "más digitales.",
      zh:
        "鼓励国际电信联盟与会员国、科技企业及民间社会组织合作,制定" +
        "关于适老化数字服务的自愿性指导方针,并建立一个知识与经验共" +
        "享平台,供会员国交流数字素养课程、标准与模式,从而增强老年" +
        "人在日益数字化的社会中独立参与的能力。"
    }
  },

  {
    kind: "question",
    speaker: "Republic of Korea",
    country: "Republic of Korea",
    targetCountry: "United Kingdom",
    flag: "🇰🇷",
    label: "Question to the United Kingdom",
    formal:
      "Although this delegate acknowledges the United Kingdom's point " +
      "on increased offline services, how does it plan on convincing " +
      "institutions and the government to invest in going back to " +
      "\"less-developed\" methods and developing offline " +
      "infrastructure when it will only benefit the seeming minority?",
    simple:
      "The UK wants offline help to stay available. But offline " +
      "services can cost a lot of money. How will the UK convince " +
      "its government to spend money on offline help, when it seems " +
      "like only a small group of people will use it?",
    translations: {
      ko:
        "본 대표는 영국의 오프라인 서비스 확대에 대한 입장을 " +
        "인정하지만, 겉보기에 소수에게만 혜택이 돌아가는 것처럼 보이는 " +
        "'덜 발전된' 방식으로의 회귀와 오프라인 인프라 개발에 기관과 " +
        "정부가 투자하도록 어떻게 설득할 계획인지 묻고 싶습니다.",
      es:
        "Aunque esta delegación reconoce el argumento del Reino Unido " +
        "a favor de ampliar los servicios fuera de línea, ¿cómo " +
        "planea convencer a las instituciones y al gobierno de " +
        "invertir en lo que parece un retorno a métodos \"menos " +
        "desarrollados\" y en infraestructura fuera de línea, cuando " +
        "en apariencia solo beneficiará a una minoría?",
      zh:
        "本代表承认英国关于加强线下服务的观点,但请问英国打算如何说" +
        "服相关机构和政府,投资于看似回归\"欠发达\"方式的线下基础设" +
        "施建设,而这似乎只会让少数人受益?"
    }
  },

  {
    kind: "answer",
    speaker: "United Kingdom",
    country: "United Kingdom",
    flag: "🇬🇧",
    label: "Response to the Republic of Korea",
    formal:
      "The United Kingdom would gently reject the premise that " +
      "offline support serves only a minority — digital exclusion in " +
      "our own review affects a substantial share of older citizens, " +
      "and essential services must remain accessible to all who fund " +
      "them through taxation, not only the digitally confident. We " +
      "would frame this not as reverting to \"less-developed\" " +
      "methods, but as maintaining a safety net alongside digital " +
      "progress, much as our Action Plan pairs new digital-skills " +
      "funding with continued face-to-face and telephone support for " +
      "services such as healthcare and pensions.",
    simple:
      "We do not agree that only a few people need offline help. Many " +
      "older people in our country cannot use the internet, and they " +
      "still pay taxes. This is not going backward — it is keeping " +
      "people safe while technology moves forward. Our plan already " +
      "does this: new digital help AND face-to-face help, together.",
    translations: {
      ko:
        "영국은 오프라인 지원이 소수만을 위한 것이라는 전제에 정중히 " +
        "반대합니다. 저희 자체 검토에 따르면 디지털 소외는 상당수의 " +
        "노년층에게 영향을 미치며, 필수 서비스는 디지털에 익숙한 " +
        "사람뿐 아니라 세금을 내는 모든 이들에게 접근 가능해야 " +
        "합니다. 저희는 이를 '덜 발전된' 방식으로의 회귀가 아니라, " +
        "디지털 발전과 함께 안전망을 유지하는 것으로 봅니다. 실제로 " +
        "저희의 실행 계획은 디지털 역량에 대한 새로운 투자와 함께, " +
        "의료·연금과 같은 서비스에 대한 대면·전화 지원을 계속 " +
        "병행하고 있습니다.",
      es:
        "El Reino Unido rechazaría, con respeto, la premisa de que el " +
        "apoyo fuera de línea beneficia solo a una minoría: nuestra " +
        "propia revisión muestra que la exclusión digital afecta a " +
        "una parte considerable de los ciudadanos mayores, y los " +
        "servicios esenciales deben seguir siendo accesibles para " +
        "todos quienes los financian mediante impuestos, no solo " +
        "para quienes dominan lo digital. No lo plantearíamos como " +
        "un retorno a métodos \"menos desarrollados\", sino como el " +
        "mantenimiento de una red de protección junto al progreso " +
        "digital, tal como nuestro Plan de Acción combina nueva " +
        "financiación para competencias digitales con apoyo " +
        "presencial y telefónico continuo para servicios como la " +
        "salud y las pensiones.",
      zh:
        "英国要礼貌地反对\"线下支持只惠及少数人\"这一前提——我们自身" +
        "的调查显示,数字排斥影响着相当一部分老年公民,而基本服务必" +
        "须让所有通过纳税支持这些服务的人都能获得,而不仅仅是那些精" +
        "通数字技术的人。我们不会将此视为回归\"欠发达\"方式,而是在" +
        "推进数字化进步的同时保留一张安全网,正如我们的行动计划将新" +
        "的数字技能投入与持续的医疗、养老金等服务的面对面及电话支持" +
        "结合在一起。"
    }
  },

  {
    kind: "chair",
    speaker: "Chair",
    country: null,
    flag: "🔔",
    label: "Adjournment",
    formal:
      "The Chair thanks the delegations for their statements. This " +
      "committee will now move toward drafting language that " +
      "reflects the shared concern for accessible, dignified digital " +
      "inclusion for older persons worldwide.",
    simple:
      "Thank you to everyone who spoke. Now we will start writing " +
      "ideas together so no one — especially older people — is left " +
      "behind as the world goes digital.",
    translations: {
      ko:
        "의장은 대표단의 발언에 감사드립니다. 본 위원회는 이제 전 " +
        "세계 노년층을 위한 접근 가능하고 존엄한 디지털 포용이라는 " +
        "공동의 관심사를 반영하는 문구 작성을 향해 나아가겠습니다.",
      es:
        "La Presidencia agradece a las delegaciones sus " +
        "declaraciones. Este comité avanzará ahora hacia la " +
        "redacción de un texto que refleje la preocupación compartida " +
        "por una inclusión digital accesible y digna para las " +
        "personas mayores de todo el mundo.",
      zh:
        "主席感谢各代表团的发言。本委员会现在将着手起草文本,以体现" +
        "各方对全世界老年人享有无障碍、有尊严的数字包容这一共同关" +
        "切。"
    }
  }
];
