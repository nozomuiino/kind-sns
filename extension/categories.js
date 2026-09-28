// 「やさしくない投稿」の分類。ここを書き換えて chrome://extensions で ↻ を押せば反映される。
// id: jev への質問名 / label: たたんだ行に出すタグ / threshold: この確率以上ならたたむ（設定画面で変えられる）
// instructions と criteria は jev への質問そのもの。1投稿につき全分類を1リクエストで聞く。
const KS_CATEGORIES = [
  {
    id: "flame_bait",
    label: "炎上狙い",
    description: "怒りや対立をあおって反応を集める",
    threshold: 0.5,
    instructions: "Is this post mainly trying to farm reactions by provoking anger, outrage or conflict?",
    criteria: {
      true: "Deliberately provocative takes, us-vs-them framing, 'fight me' style bait or clickbait " +
        "meant to trigger replies, quote posts or reposts.",
      false: "Shares opinions, information or feelings without trying to provoke readers.",
    },
  },
  {
    id: "fear_mongering",
    label: "不安あおり",
    description: "「手遅れ」「崩壊」などで恐怖をあおる、根拠のない断定",
    threshold: 0.5,
    instructions: "Does this post stir up fear or anxiety with alarmist or unfounded claims?",
    criteria: {
      true: "Alarmist predictions, false urgency such as 'it's too late', conspiracy hints or sweeping " +
        "claims without evidence, written to scare readers.",
      false: "Reports facts or concerns calmly, or is not about threats at all.",
    },
  },
  {
    id: "ridicule",
    label: "見下し・嘲笑",
    description: "「頭悪すぎて草」など、人を笑いものにする",
    threshold: 0.5,
    instructions: "Does this post mock, belittle or look down on people?",
    criteria: {
      true: "Laughs at people, calls them stupid, sneers at them or talks down to them.",
      false: "Treats people with basic respect, even when disagreeing.",
    },
  },
  {
    id: "targeted_attack",
    label: "名指しの攻撃",
    description: "特定の人へのリプライで叩く、晒す",
    threshold: 0.5,
    instructions: "Does this post attack or shame a specific, identifiable person?",
    criteria: {
      true: "Criticizes, insults, exposes or calls out a named, mentioned or replied-to individual in a " +
        "hostile way, or invites others to pile on them.",
      false: "Does not target a specific person, or mentions them neutrally or kindly.",
    },
  },
  {
    id: "group_attack",
    label: "属性への攻撃",
    description: "性別・国籍・世代などでひとくくりにして攻撃する",
    threshold: 0.5,
    instructions: "Does this post attack or negatively stereotype people based on a group they belong to?",
    criteria: {
      true: "Makes negative generalizations about people by gender, nationality, ethnicity, age or " +
        "generation, religion, occupation, region or a similar group.",
      false: "Makes no negative generalization about a group of people.",
    },
  },
  {
    id: "passive_aggression",
    label: "マウント・嫌味",
    description: "直接の暴言ではないけれど、読むとしんどくなる",
    threshold: 0.5,
    instructions: "Is this post passive-aggressive, condescending or one-upping others?",
    criteria: {
      true: "Sarcasm, backhanded remarks, humblebrags or one-upmanship that makes readers feel small, " +
        "without open insults.",
      false: "Sincere and straightforward, without digs at others.",
    },
  },
];
