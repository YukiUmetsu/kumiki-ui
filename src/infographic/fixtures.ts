/**
 * Showcase fixtures for the infographic system.
 *
 * These are real, typed `InfographicSource` documents — not screenshots and not
 * prose. Every demo in the gallery, every golden export and every test builds
 * from this file, so a fixture that stops validating fails the suite rather than
 * quietly rendering something different.
 *
 * Two rules hold throughout, because they are what the system is *for*
 * (`docs/12` §4 and §8):
 *
 * 1. Numbers are never invented to look good. Fixtures that are not backed by a
 *    cited measurement say so in their evidence text, and missing values stay
 *    `null` instead of becoming zero.
 * 2. Copy is anonymous and reusable. No product names, no customer journeys and
 *    no industry-specific claims — the fixtures demonstrate layout and
 *    disclosure behaviour, nothing else.
 */
import type {
  ArtDirectionId,
  InfographicSource,
  OutputProfileId,
} from "../../registry/infographic";

const ILLUSTRATIVE =
  "Illustrative dataset for layout demonstration — not measured production data.";

/** The docs/12 §10 gold reference: question → embed/search → retrieve → construct → generate. */
export const RAG_EXPLAINER: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "rag-explainer",
  language: "en",
  title: "How retrieval-augmented generation works",
  subtitle: "From question to grounded answer",
  thesis:
    "Retrieval lets a language model answer from sources it can cite instead of from weights alone, which makes each claim traceable.",
  evidence: [
    {
      id: "ev-paper",
      label: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      sourceUri: "https://arxiv.org/abs/2005.11401",
      retrievedAt: "2026-03-04",
      licenseNote: "CC BY 4.0",
    },
    {
      id: "ev-eval",
      label: "Internal retrieval evaluation, 1,200 held-out questions",
      retrievedAt: "2026-02-18",
    },
    { id: "ev-docs", label: "Product documentation: grounding and citations" },
  ],
  sections: [
    {
      id: "question",
      kind: "text",
      heading: "The question",
      importance: "hero",
      evidenceRefs: ["ev-docs"],
      summary:
        "A question arrives that the model cannot answer reliably from memory alone, so the answer has to come from retrieved sources.",
      paragraphs: [
        "A question arrives that a model cannot answer reliably from memory alone. The answer has to come from sources, and the reader has to be able to check them.",
      ],
      bullets: [
        "Sources change more often than training runs",
        "Readers need the passage, not just the conclusion",
      ],
    },
    {
      id: "pipeline",
      kind: "process",
      heading: "The pipeline",
      importance: "hero",
      evidenceRefs: ["ev-paper"],
      summary:
        "Five steps turn a question into a cited answer: receive, embed and search, retrieve, construct context, generate.",
      layout: "linear",
      steps: [
        {
          id: "step-receive",
          title: "Receive the question",
          description:
            "The question is kept verbatim for the answer and for evaluating retrieval quality.",
          nextIds: ["step-embed"],
        },
        {
          id: "step-embed",
          title: "Embed and search",
          description:
            "The question is embedded into the same vector space as the corpus and matched against an index.",
          nextIds: ["step-retrieve"],
        },
        {
          id: "step-retrieve",
          title: "Retrieve passages",
          description:
            "The top candidates are re-ranked by relevance, deduplicated and cut to a passage size that fits the context budget.",
          mode: "repeated",
          nextIds: ["step-context"],
        },
        {
          id: "step-context",
          title: "Construct the context",
          description:
            "Passages are packed into a bounded window, newest and most relevant first, with their source identifiers attached.",
          nextIds: ["step-generate"],
        },
        {
          id: "step-generate",
          title: "Generate a grounded answer",
          description:
            "The model answers from the supplied passages and cites them; unsupported sentences are dropped.",
        },
      ],
    },
    {
      id: "stat-ungrounded",
      kind: "statistic",
      heading: "Measured effect",
      importance: "supporting",
      evidenceRefs: ["ev-eval"],
      summary:
        "On 1,200 held-out questions, ungrounded answers were 20 percentage points less frequent with retrieval enabled.",
      value: 32,
      unit: "%",
      measureLabel: "fewer unsupported claims",
      denominator: 1200,
      period: "Q1 2026",
      baseline: 52,
      precision: 0,
    },
    {
      id: "compare-methods",
      kind: "comparison",
      heading: "Two ways to answer",
      importance: "supporting",
      evidenceRefs: ["ev-docs"],
      summary:
        "Retrieval costs latency but buys grounding, citations and freshness that a memory-only answer cannot provide.",
      criteria: ["Grounding", "Citations", "Freshness", "Added latency"],
      cases: [
        {
          id: "case-rag",
          label: "Retrieval + generation",
          emphasis: true,
          values: {
            Grounding: "Supplied passages",
            Citations: "Passage-level",
            Freshness: "Index dependent",
            "Added latency": "+82 ms",
          },
        },
        {
          id: "case-memory",
          label: "Model memory only",
          values: {
            Grounding: "Parametric only",
            Citations: null,
            Freshness: "Training cutoff",
            "Added latency": "Baseline",
          },
        },
      ],
    },
    {
      id: "takeaway",
      kind: "text",
      heading: "Takeaway",
      importance: "supporting",
      evidenceRefs: ["ev-eval", "ev-paper"],
      summary:
        "Retrieval is worth its latency because it replaces confident recall with a passage the reader can check.",
      paragraphs: [
        "Retrieval costs latency and index maintenance. It earns that cost by replacing confident recall with a passage the reader can check, and by letting the corpus change without retraining the model.",
      ],
    },
  ],
  annotations: [
    {
      id: "anno-context",
      targetId: "step-context",
      label: "Bounded window",
      detail: "The context budget is enforced before generation, never after.",
      side: "bottom",
      shape: "leader",
      priority: 1,
    },
    {
      id: "anno-measured",
      targetId: "stat-ungrounded",
      label: "Measured, not assumed",
      side: "left",
      shape: "bracket",
    },
  ],
};

/** The docs/12 §3 `data-story` shape: question, data, evidence, takeaway. */
export const RETRIEVAL_QUALITY: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "retrieval-quality",
  language: "en",
  title: "Where retrieval quality comes from",
  subtitle: "Answer accuracy by number of retrieved passages",
  thesis: "More passages help until context noise starts to cost more than it adds.",
  evidence: [
    {
      id: "ev-bench",
      label: ILLUSTRATIVE,
      retrievedAt: "2026-02-18",
    },
    { id: "ev-method", label: "Evaluation method: held-out questions, single reviewer" },
  ],
  sections: [
    {
      id: "ds-question",
      kind: "text",
      heading: "The question",
      importance: "hero",
      evidenceRefs: ["ev-method"],
      summary:
        "If retrieval is what grounds an answer, how many passages should the context hold?",
      paragraphs: [
        "If retrieved passages are what ground an answer, the practical question is how many of them the context should hold.",
      ],
    },
    {
      id: "ds-chart",
      kind: "chart",
      heading: "Accuracy by passage count",
      importance: "hero",
      evidenceRefs: ["ev-bench"],
      summary:
        "Accuracy rises through eight passages and then flattens, while latency keeps climbing.",
      chart: {
        recipe: "bar",
        categories: ["None", "2", "4", "8", "16"],
        unit: "%",
        scale: { kind: "linear", zero: true },
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Passages in context", y: "Answer accuracy" },
        series: [
          { id: "series-accuracy", label: "Answer accuracy", values: [41, 68, 79, 84, 85] },
        ],
      },
    },
    {
      id: "ds-evidence",
      kind: "chart",
      heading: "What that costs",
      importance: "supporting",
      evidenceRefs: ["ev-bench"],
      summary:
        "Added latency grows roughly linearly with passage count, so the flat part of the accuracy curve is the useful region.",
      chart: {
        recipe: "line",
        categories: ["None", "2", "4", "8", "16"],
        unit: "ms",
        scale: { kind: "linear", zero: true },
        sourceNote: ILLUSTRATIVE,
        missingPolicy: "gap",
        axisLabels: { x: "Passages in context", y: "Added latency" },
        series: [{ id: "series-latency", label: "Added latency", values: [0, 38, 82, 149, 268] }],
      },
    },
    {
      id: "ds-takeaway",
      kind: "text",
      heading: "Takeaway",
      importance: "supporting",
      evidenceRefs: ["ev-bench", "ev-method"],
      summary:
        "Eight passages buys most of the accuracy; going further mostly buys latency, and the measurement itself is single-reviewer.",
      paragraphs: [
        "Eight passages buys most of the available accuracy. Beyond that the curve flattens while latency keeps climbing, and because this evaluation used a single reviewer the difference between 8 and 16 is inside the noise.",
      ],
    },
  ],
};

/** The docs/12 §3 `bento-summary` shape: one primary insight, grouped secondary metrics. */
export const CACHE_SUMMARY: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "cache-summary",
  language: "en",
  title: "What a shared cache changed",
  subtitle: "Four measurements from one quarter",
  thesis: "Caching moved work from the request path to a background step, and the numbers show it.",
  evidence: [
    { id: "ev-quarter", label: ILLUSTRATIVE, retrievedAt: "2026-04-02" },
    { id: "ev-instr", label: "Instrumentation: server timings, sampled at 10%" },
  ],
  sections: [
    {
      id: "cache-hit",
      kind: "statistic",
      heading: "Cache hit rate",
      importance: "hero",
      evidenceRefs: ["ev-quarter"],
      summary: "78 percent of lookups were served from cache rather than recomputed.",
      value: 78,
      unit: "%",
      measureLabel: "of lookups served from cache",
      denominator: 4_180_000,
      period: "Q1 2026",
      precision: 0,
    },
    {
      id: "cache-latency",
      kind: "statistic",
      heading: "Median lookup",
      importance: "supporting",
      evidenceRefs: ["ev-instr"],
      summary: "Median lookup latency fell from 240 ms to 61 ms.",
      value: 61,
      unit: "ms",
      measureLabel: "median lookup latency",
      period: "Q1 2026",
      baseline: 240,
      precision: 0,
    },
    {
      id: "cache-stale",
      kind: "statistic",
      heading: "Stale responses",
      importance: "supporting",
      evidenceRefs: ["ev-quarter"],
      summary: "Stale responses rose slightly, from 0.4 to 0.9 percent of lookups.",
      value: 0.9,
      unit: "%",
      measureLabel: "responses served past their freshness window",
      period: "Q1 2026",
      baseline: 0.4,
      precision: 1,
    },
    {
      id: "cache-note",
      kind: "text",
      heading: "Read with care",
      importance: "detail",
      evidenceRefs: ["ev-instr"],
      summary:
        "The latency figure is a median from sampled server timings, and the staleness increase is inside the sampling error.",
      paragraphs: [
        "The latency figure is a median over sampled server timings, not a per-request measurement. The rise in stale responses is small enough to sit inside the sampling error, so it is reported but not treated as a regression.",
      ],
    },
    {
      id: "cache-quote",
      kind: "quote",
      heading: "From the review",
      importance: "detail",
      evidenceRefs: ["ev-quarter"],
      summary: "The review note asks for the freshness window to be revisited before the next quarter.",
      data: {
        quote: "The cache is doing its job. Revisit the freshness window next quarter.",
        attribution: "Quarterly review note",
        attributionPlacement: "below",
      },
    },
  ],
};

/** Timeline + hierarchy + quote: the shapes a roadmap or org-style explainer needs. */
export const RELEASE_JOURNEY: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "release-journey",
  language: "en",
  title: "How a release reaches production",
  subtitle: "Dated milestones and the decision tree behind them",
  evidence: [
    { id: "ev-log", label: ILLUSTRATIVE, retrievedAt: "2026-04-11" },
    { id: "ev-policy", label: "Release policy: how changes are reviewed and rolled back" },
  ],
  sections: [
    {
      id: "journey-timeline",
      kind: "timeline",
      heading: "Milestones",
      importance: "hero",
      evidenceRefs: ["ev-log"],
      summary:
        "Four milestones over eleven weeks: proposal, review, staged rollout, and general availability.",
      milestones: [
        {
          id: "ms-proposal",
          label: "Proposal",
          at: "2026-01-12",
          kind: "instant",
          description: "Problem statement and success measures agreed.",
        },
        {
          id: "ms-review",
          label: "Design review",
          at: "2026-01-26",
          kind: "instant",
          description: "Risks and rollback path walked through with reviewers.",
        },
        {
          id: "ms-rollout",
          label: "Staged rollout",
          at: "2026-02-09",
          endAt: "2026-03-09",
          kind: "interval",
          description: "One percent, then ten, then half the population.",
        },
        {
          id: "ms-ga",
          label: "General availability",
          at: "2026-03-30",
          kind: "instant",
        },
      ],
    },
    {
      id: "journey-tree",
      kind: "hierarchy",
      heading: "Who decides what",
      importance: "supporting",
      evidenceRefs: ["ev-policy"],
      summary:
        "Two approval gates with a shared escalation path, so rollback authority never waits on a committee.",
      root: {
        id: "node-release",
        label: "Release",
        importance: "hero",
        children: [
          {
            id: "node-quality",
            label: "Quality gate",
            description: "Tests, coverage and error budget",
            children: [
              { id: "node-tests", label: "Automated checks" },
              { id: "node-budget", label: "Error budget review" },
            ],
          },
          {
            id: "node-risk",
            label: "Risk gate",
            description: "Blast radius and rollback path",
            children: [
              { id: "node-rollback", label: "Rollback plan" },
              { id: "node-observability", label: "Observability check" },
            ],
          },
        ],
      },
    },
    {
      id: "journey-flow",
      kind: "diagram",
      heading: "Decision path",
      importance: "supporting",
      evidenceRefs: ["ev-policy"],
      summary:
        "A change either clears both gates, returns for revision, or is rolled back and re-enters the queue.",
      diagram: {
        direction: "horizontal",
        nodes: [
          { id: "d-propose", label: "Change proposed", importance: "hero" },
          { id: "d-quality", label: "Quality gate" },
          { id: "d-risk", label: "Risk gate" },
          { id: "d-ship", label: "Ship", importance: "supporting" },
          { id: "d-revise", label: "Revise", importance: "detail" },
        ],
        edges: [
          { id: "e-1", from: "d-propose", to: "d-quality" },
          { id: "e-2", from: "d-quality", to: "d-risk" },
          { id: "e-3", from: "d-risk", to: "d-ship" },
          { id: "e-4", from: "d-quality", to: "d-revise", label: "Fails", weight: 0.5 },
          { id: "e-5", from: "d-risk", to: "d-revise", label: "Blast radius", weight: 0.3 },
          { id: "e-6", from: "d-revise", to: "d-propose" },
        ],
      },
    },
    {
      id: "journey-note",
      kind: "text",
      heading: "Why the interval matters",
      importance: "detail",
      evidenceRefs: ["ev-log"],
      summary:
        "The staged rollout is an interval, not a milestone: the change is live for a month before it is permanent.",
      paragraphs: [
        "The staged rollout is drawn as an interval because the change is live for a month before it becomes permanent. Collapsing it into a single date would hide the part of the process that catches regressions.",
      ],
    },
  ],
  annotations: [
    {
      id: "anno-rollout",
      targetId: "ms-rollout",
      label: "Not a single date",
      side: "top",
      shape: "bracket",
    },
  ],
};

/**
 * Mixed-script source. Latin and Japanese copy, a long unbroken token and a
 * mixed date/relative timeline — the fixture that catches naive wrapping and
 * left-to-right-only assumptions (`docs/12` §5).
 */
export const MIXED_SCRIPT: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "mixed-script",
  language: "ja",
  title: "検索の仕組み / How search works",
  subtitle: "質問から根拠のある回答まで",
  thesis:
    "検索は「思い出す」処理を「確かめられる」処理に置き換える。 Retrieval replaces recall with something a reader can check.",
  evidence: [
    { id: "ev-ja", label: "社内検索の利用状況レポート（説明用のサンプル値）", retrievedAt: "2026-02-18" },
    { id: "ev-doc", label: "Documentation: 検索インデックスの更新方針" },
  ],
  sections: [
    {
      id: "ja-question",
      kind: "text",
      heading: "質問 (The question)",
      importance: "hero",
      evidenceRefs: ["ev-doc"],
      summary:
        "利用者の質問は、モデルが記憶だけでは答えられない内容であることが多い。 Questions often exceed what a model can answer from memory alone.",
      paragraphs: [
        "利用者の質問は、モデルが記憶だけでは答えられない内容であることが多い。そのため回答は「取得した文書」に基づく必要がある。",
        "Index freshness matters more than index size: a stale index produces confident, wrong answers.",
      ],
    },
    {
      id: "ja-stats",
      kind: "statistic",
      heading: "計測値 (Measured)",
      importance: "supporting",
      evidenceRefs: ["ev-ja"],
      summary:
        "回答のうち根拠を示せた割合は、検索を有効にすると 41 パーセントから 78 パーセントへ上がった。",
      value: 78,
      unit: "%",
      measureLabel: "根拠を示せた回答の割合",
      denominator: 1200,
      period: "2026年第1四半期",
      baseline: 41,
      precision: 0,
    },
    {
      id: "ja-timeline",
      kind: "timeline",
      heading: "更新の履歴 (Index history)",
      importance: "supporting",
      evidenceRefs: ["ev-doc"],
      summary:
        "二つの日付付きマイルストーンと、日付のない相対的なマイルストーンを混在させている。",
      milestones: [
        { id: "ms-index-launch", label: "インデックス公開", at: "2025-11-04" },
        { id: "ms-index-rebuild", label: "全面再構築", at: "2026-01-20", description: "週次から日次へ" },
        { id: "ms-next", label: "次回の見直し", at: "次の四半期" },
      ],
    },
    {
      id: "ja-note",
      kind: "text",
      heading: "注意 (Caveat)",
      importance: "detail",
      evidenceRefs: ["ev-ja"],
      summary:
        "サンプル値であり、実際の計測値ではない。 Illustrative figures, not measured production data.",
      paragraphs: [
        "この図の数値は説明用のサンプルであり、実際の計測値ではない。長い URL も同様に表示幅の検証のために含めている: https://example.invalid/documentation/search-index-freshness-policy/overview?ref=infographic-fixture",
      ],
    },
  ],
};

/**
 * Deliberately incomplete data. Every gap here should surface as a warning plus
 * a disclosure, never as a silent zero (`docs/12` §8).
 */
export const GAPS_AND_UNKNOWNS: InfographicSource = {
  kind: "infographic-source",
  version: 1,
  id: "gaps-and-unknowns",
  language: "en",
  title: "What we do not know yet",
  subtitle: "A report with missing measurements left missing",
  thesis: "Missing is a category, not a number.",
  evidence: [
    { id: "ev-partial", label: ILLUSTRATIVE, retrievedAt: "2026-04-05" },
    { id: "ev-suppressed", label: "Two sites are below the reporting threshold and are suppressed" },
  ],
  sections: [
    {
      id: "gap-caveat",
      kind: "text",
      heading: "How to read this",
      importance: "hero",
      evidenceRefs: ["ev-partial", "ev-suppressed"],
      summary:
        "Blank cells are missing measurements, suppressed cells are withheld by policy, and neither is a zero.",
      paragraphs: [
        "A blank cell means the measurement is missing. A suppressed cell means it exists but is withheld because the sample is too small to report. Neither is a zero, and neither should be read as one.",
      ],
    },
    {
      id: "gap-compare",
      kind: "comparison",
      heading: "Coverage by site",
      importance: "supporting",
      evidenceRefs: ["ev-partial", "ev-suppressed"],
      summary:
        "One site has no coverage figure at all and one is suppressed; the rest report a measured range.",
      criteria: ["Coverage", "Median queue time", "Incidents"],
      cases: [
        {
          id: "case-north",
          label: "Site A",
          values: { Coverage: "94%", "Median queue time": "11 min", Incidents: 2 },
        },
        {
          id: "case-south",
          label: "Site B",
          values: { Coverage: null, "Median queue time": "18 min", Incidents: 0 },
        },
        {
          id: "case-east",
          label: "Site C",
          values: { Coverage: "88%", "Median queue time": null, Incidents: 1 },
        },
      ],
    },
    {
      id: "gap-chart",
      kind: "chart",
      heading: "Weekly volume",
      importance: "supporting",
      evidenceRefs: ["ev-partial"],
      summary:
        "Two weeks are unmeasured. The series is drawn with gaps and the disclosure says so.",
      chart: {
        recipe: "line",
        categories: ["W1", "W2", "W3", "W4", "W5", "W6"],
        unit: "items",
        scale: { kind: "linear", zero: true },
        missingPolicy: "gap",
        sourceNote: ILLUSTRATIVE,
        axisLabels: { x: "Week", y: "Items processed" },
        series: [{ id: "series-volume", label: "Items processed", values: [120, null, 143, 139, null, 151] }],
      },
    },
    {
      id: "gap-diagram",
      kind: "diagram",
      heading: "Where the gaps come from",
      importance: "detail",
      evidenceRefs: ["ev-suppressed"],
      summary: "Two of the four collection paths were offline, which is why the series has holes.",
      diagram: {
        direction: "vertical",
        nodes: [
          { id: "d-collect", label: "Collection" },
          { id: "d-path-a", label: "Path A" },
          { id: "d-path-b", label: "Path B" },
          { id: "d-report", label: "Weekly report", importance: "hero" },
        ],
        edges: [
          { id: "e-a", from: "d-collect", to: "d-path-a" },
          { id: "e-b", from: "d-collect", to: "d-path-b" },
          { id: "e-a2", from: "d-path-a", to: "d-report" },
          { id: "e-b2", from: "d-path-b", to: "d-report" },
        ],
      },
    },
  ],
};

/** Every source the gallery and the golden-export test render. */
export const FIXTURE_SOURCES: readonly InfographicSource[] = [
  RAG_EXPLAINER,
  RETRIEVAL_QUALITY,
  CACHE_SUMMARY,
  RELEASE_JOURNEY,
  MIXED_SCRIPT,
  GAPS_AND_UNKNOWNS,
];

/** The six art directions, in the order the gallery shows them. */
export const GALLERY_ART_DIRECTIONS: readonly ArtDirectionId[] = [
  "editorial",
  "minimal-technical",
  "cinematic",
  "scientific",
  "illustrated",
  "sketch",
];

/** Output profiles exercised by the responsive demo. */
export const GALLERY_PROFILES: readonly OutputProfileId[] = [
  "youtube-landscape",
  "pinterest-vertical",
  "social-square",
  "short-portrait",
];

/**
 * Invalid documents, each paired with the diagnostic code it must produce.
 *
 * These exist so the validation guarantees are testable rather than asserted in
 * prose, and so a regression that starts accepting broken input is caught.
 */
export const NEGATIVE_SOURCES: ReadonlyArray<{
  name: string;
  input: unknown;
  codes: readonly string[];
}> = [
  {
    name: "wrong kind",
    input: { kind: "infographic", version: 1, id: "x", title: "x", language: "en", sections: [], evidence: [] },
    codes: ["invalid-source-kind"],
  },
  {
    name: "unsupported version",
    input: {
      kind: "infographic-source",
      version: 2,
      id: "x",
      title: "x",
      language: "en",
      sections: [{ id: "s", kind: "text", summary: "s", paragraphs: ["p"] }],
      evidence: [],
    },
    codes: ["unsupported-version"],
  },
  {
    name: "unknown evidence reference",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [{ id: "s", kind: "text", summary: "s", paragraphs: ["p"], evidenceRefs: ["missing"] }],
      evidence: [],
    },
    codes: ["unknown-evidence-ref"],
  },
  {
    name: "orphan annotation",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [{ id: "s", kind: "text", summary: "s", paragraphs: ["p"] }],
      evidence: [],
      annotations: [{ id: "a", targetId: "nowhere", label: "Label" }],
    },
    codes: ["annotation-orphan"],
  },
  {
    name: "empty process",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [{ id: "s", kind: "process", summary: "s", steps: [] }],
      evidence: [],
    },
    codes: ["process-empty"],
  },
  {
    name: "cyclic process",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [
        {
          id: "s",
          kind: "process",
          summary: "s",
          steps: [
            { id: "a", title: "A", nextIds: ["b"] },
            { id: "b", title: "B", nextIds: ["a"] },
          ],
        },
      ],
      evidence: [],
    },
    codes: ["process-cycle"],
  },
  {
    name: "unknown next step",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [
        { id: "s", kind: "process", summary: "s", steps: [{ id: "a", title: "A", nextIds: ["ghost"] }] },
      ],
      evidence: [],
    },
    codes: ["unknown-next-step"],
  },
  {
    name: "duplicate section id",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [
        { id: "dup", kind: "text", summary: "a", paragraphs: ["p"] },
        { id: "dup", kind: "text", summary: "b", paragraphs: ["p"] },
      ],
      evidence: [],
    },
    codes: ["duplicate-section-id"],
  },
  {
    name: "incomplete quote",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [{ id: "s", kind: "quote", summary: "s", data: { quote: "", attribution: "" } }],
      evidence: [],
    },
    codes: ["quote-incomplete"],
  },
  {
    name: "empty comparison",
    input: {
      kind: "infographic-source",
      version: 1,
      id: "x",
      title: "x",
      language: "en",
      sections: [{ id: "s", kind: "comparison", summary: "s", criteria: ["A"], cases: [] }],
      evidence: [],
    },
    codes: ["comparison-missing-cases"],
  },
];
