import { ASSET_DEFINITIONS } from "@/features/editor/domain/asset-data";
import type {
  Finger,
  NailFinish,
  NailLength,
  NailShape,
} from "@/features/editor/domain/types";

export type {
  Finger,
  NailFinish,
  NailLength,
  NailShape,
} from "@/features/editor/domain/types";

export type RenderStrategy = "library" | "hybrid" | "generative";

export type NailElementSpec = {
  assetId: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type FingerPlan = {
  finger: Finger;
  baseColor: string;
  finish: NailFinish;
  elements: NailElementSpec[];
};

export type NailSetSpec = {
  shape: NailShape;
  length: NailLength;
  palette: string[];
  finish: NailFinish;
  styleTags: string[];
  strategy: RenderStrategy;
  requiredConcepts: string[];
  forbiddenConcepts: string[];
  novelConcepts: string[];
  diffusionPrompt: string;
  negativePrompt: string;
  designSummary: string;
  nails: FingerPlan[];
};

export type CandidateScore = {
  index: number;
  total: number;
  promptAdherence: number;
  nailIsolation: number;
  shapeMatch: number;
  detailPresence: number;
  aesthetics: number;
  failureReasons: string[];
};

export type CandidateJudge = {
  selectedIndex: number;
  selectedReason: string;
  scores: CandidateScore[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const SHAPES = new Set<NailShape>(["almond", "oval", "square", "coffin", "stiletto"]);
const LENGTHS = new Set<NailLength>(["short", "medium", "long"]);
const FINISHES = new Set<NailFinish>(["glossy", "matte", "chrome", "glitter", "jelly"]);
const STRATEGIES = new Set<RenderStrategy>(["library", "hybrid", "generative"]);
const FINGER_VALUES = new Set<Finger>(["pinky", "ring", "middle", "index", "thumb"]);

function isElementSpec(value: unknown): value is NailElementSpec {
  return isRecord(value) &&
    typeof value.assetId === "string" &&
    typeof value.color === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.scale === "number" &&
    typeof value.rotation === "number" &&
    typeof value.opacity === "number";
}

function isFingerPlan(value: unknown): value is FingerPlan {
  return isRecord(value) &&
    typeof value.finger === "string" && FINGER_VALUES.has(value.finger as Finger) &&
    typeof value.baseColor === "string" &&
    typeof value.finish === "string" && FINISHES.has(value.finish as NailFinish) &&
    Array.isArray(value.elements) && value.elements.every(isElementSpec);
}

export function isNailSetSpec(value: unknown): value is NailSetSpec {
  if (!isRecord(value)) return false;
  if (typeof value.shape !== "string" || !SHAPES.has(value.shape as NailShape)) return false;
  if (typeof value.length !== "string" || !LENGTHS.has(value.length as NailLength)) return false;
  if (typeof value.finish !== "string" || !FINISHES.has(value.finish as NailFinish)) return false;
  if (typeof value.strategy !== "string" || !STRATEGIES.has(value.strategy as RenderStrategy)) return false;
  if (!stringArray(value.palette) || !stringArray(value.styleTags)) return false;
  if (!stringArray(value.requiredConcepts) || !stringArray(value.forbiddenConcepts)) return false;
  if (!stringArray(value.novelConcepts)) return false;
  if (typeof value.diffusionPrompt !== "string" || typeof value.negativePrompt !== "string") return false;
  if (typeof value.designSummary !== "string" || !Array.isArray(value.nails)) return false;
  if (!value.nails.every(isFingerPlan)) return false;
  return new Set(value.nails.map((plan) => plan.finger)).size === 5;
}

export const NUVII_ASSET_CATALOG: readonly (readonly [string, string])[] =
  ASSET_DEFINITIONS.map((asset) => [
    asset.id,
    `${asset.name}; ${asset.tags.join(", ")}`,
  ] as const);

export const NUVII_ASSET_IDS = NUVII_ASSET_CATALOG.map(([id]) => id);
export const NUVII_ASSET_DESCRIPTION = NUVII_ASSET_CATALOG
  .map(([id, description]) => `${id}: ${description}`)
  .join("\n");

const COLOR_WORDS: Record<string, string> = {
  nude: "#eac4b5",
  beige: "#e5c6ad",
  pink: "#efbfd0",
  blush: "#efbfd0",
  ballet: "#f7dce5",
  white: "#fffaf7",
  milky: "#fffaf7",
  red: "#a72146",
  cherry: "#95163d",
  burgundy: "#701f32",
  brown: "#61392f",
  chocolate: "#61392f",
  green: "#8ea67d",
  sage: "#a9b89e",
  blue: "#4e72c8",
  cobalt: "#2f49b0",
  sky: "#acd4e8",
  lavender: "#c8b6df",
  purple: "#9e78c7",
  black: "#252525",
  yellow: "#f4dfa0",
  orange: "#ef8f62",
  silver: "#c6cbd4",
  gold: "#d7ad4d",
};

const FINGERS: Finger[] = ["pinky", "ring", "middle", "index", "thumb"];

function matchColor(prompt: string, fallback: string) {
  const lower = prompt.toLowerCase();
  const entry = Object.entries(COLOR_WORDS).find(([word]) => lower.includes(word));
  return entry?.[1] ?? fallback;
}

function chooseFinish(prompt: string, fallback: NailFinish = "glossy"): NailFinish {
  const lower = prompt.toLowerCase();
  if (/matte/.test(lower)) return "matte";
  if (/jelly|translucent|glass/.test(lower)) return "jelly";
  if (/glitter|sparkly|shimmer/.test(lower)) return "glitter";
  if (/full chrome|metallic base/.test(lower)) return "chrome";
  return fallback;
}

const DIFFUSION_CONCEPT_HINTS: readonly {
  pattern: RegExp;
  prompt: string;
}[] = [
  {
    pattern: /\b(?:fall|autumn)\b/i,
    prompt: "autumn burnt-orange and cream palette",
  },
  {
    pattern: /\bpumpkins?\b/i,
    prompt: "recognizable orange pumpkin with curved ribs and green stem",
  },
  {
    pattern: /\b(?:chrome|metallic|liquid metal)\b/i,
    prompt: "reflective chrome",
  },
  {
    pattern: /\b(?:jelly|translucent|glass)\b/i,
    prompt: "translucent jelly",
  },
  {
    pattern: /\b(?:sculpted|raised|3d)\b/i,
    prompt: "raised sculpted gel",
  },
  {
    pattern: /\bbutterfl(?:y|ies)\b/i,
    prompt: "recognizable butterfly with open detailed wings",
  },
];

function diffusionConceptPrompt(
  prompt: string,
  requiredConcepts: string[],
): string {
  const hints = DIFFUSION_CONCEPT_HINTS
    .filter((hint) => hint.pattern.test(prompt))
    .map((hint) => hint.prompt);
  const lower = prompt.toLowerCase();
  const additionalConcepts = requiredConcepts.filter(
    (concept) => !lower.includes(concept.toLowerCase()),
  );
  return [
    prompt.trim(),
    additionalConcepts.join(", "),
    ...hints,
    "clearly visible professional nail art",
  ].filter(Boolean).join(", ");
}

function pushUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

function matchedAssets(prompt: string): { ids: string[]; concepts: string[]; novel: string[] } {
  const lower = prompt.toLowerCase();
  const ids: string[] = [];
  const concepts: string[] = [];
  const novel: string[] = [];
  const silver = /silver/.test(lower);
  const chrome = /chrome|metallic/.test(lower);
  const add = (id: string, concept: string) => {
    pushUnique(ids, id);
    pushUnique(concepts, concept);
  };

  if (/french|tip|smile line/.test(lower)) add("design-french-curve", "French tip");
  if (/aura|halo|center glow/.test(lower)) add("design-lilac-aura", "aura");
  if (/ombre|gradient|fade/.test(lower)) add("design-cloud-ombre", "ombre");
  if (/cheetah|leopard/.test(lower)) add("design-leopard-spots", "leopard print");
  if (/checker|graphic pattern/.test(lower)) add("design-checker-wave", "checker pattern");
  if (/starburst|sparkle|star|celestial/.test(lower)) {
    add(chrome ? (silver ? "chrome-silver-orbit" : "chrome-gold-swoop") : "design-twinkle-star", "stars");
  }
  if (/heart|valentine|romantic/.test(lower)) add("design-puffy-heart", "heart");
  if (/flower|floral|daisy|orchid/.test(lower)) {
    add(/3d|raised|sculpted|orchid/.test(lower) ? "3d-sculpted-flower" : "design-daisy-cluster", "flower");
  }
  if (/shell|seashell|mermaid/.test(lower)) add("3d-mini-shell", "shell");
  if (/bubble|water drop/.test(lower)) add("3d-clear-bubbles", "gel bubbles");
  if (/swirl|abstract line/.test(lower)) {
    add(/3d|raised|gel/.test(lower) ? "3d-gel-ripple" : "design-ribbon-swirl", "swirl");
  }
  if (/pearl/.test(lower)) add("charm-pearl-trio", "pearls");
  if (/rhinestone|crystal|gem|bling/.test(lower)) {
    add(/rhinestone/.test(lower) ? "charm-rhinestone" : "charm-prism-gem", "rhinestones");
  }

  if (/chrome bow|metallic bow|silver bow|gold bow/.test(lower)) {
    add("charm-metal-bow", `${silver ? "silver" : "gold"} metallic bow`);
  } else if (/bow|coquette|ribbon/.test(lower)) {
    add("design-soft-bow", "bow");
  }
  if (/chrome swirl|liquid chrome|chrome accent|isolated chrome/.test(lower)) {
    add(silver ? "chrome-silver-orbit" : "chrome-gold-swoop", "chrome accent");
  }
  if (/liquid drop|molten drop/.test(lower)) add("chrome-liquid-drop", "liquid chrome drop");
  if (/chain/.test(lower)) add("charm-fine-chain", "chain");
  if (/caviar|micro bead/.test(lower)) add("charm-caviar-curve", "caviar beads");

  const novelPatterns = [
    [/(portrait|face|character|logo|lettering|text art)/, "illustrative artwork"],
    [/(marble|stone texture|tortoise shell|airbrush scene)/, "complex texture"],
    [/(liquid metal sculpture|organic metallic sculpture|intricate sculpture)/, "novel sculpture"],
    [/(photo realistic|photorealistic scene|landscape|painting)/, "complex illustration"],
    [/(zebra|flame|fire|butterfly|crescent moon)/, "custom illustrated motif"],
  ] as const;
  novelPatterns.forEach(([pattern, label]) => {
    if (pattern.test(lower)) novel.push(label);
  });

  return { ids, concepts, novel };
}

function defaultPlacement(assetId: string, order: number): Omit<NailElementSpec, "assetId" | "color"> {
  if (assetId === "design-french-curve") return { x: 50, y: 146, scale: 105, rotation: 0, opacity: 1 };
  if (assetId === "design-lilac-aura" || assetId === "design-cloud-ombre") return { x: 50, y: 92, scale: 135, rotation: 0, opacity: 0.9 };
  if (/bow/.test(assetId)) return { x: 50, y: 44 + order * 5, scale: 50, rotation: 0, opacity: 1 };
  if (/chain|frame/.test(assetId)) return { x: 50, y: 88, scale: 78, rotation: 0, opacity: 1 };
  if (/pearl|gem|rhinestone|caviar/.test(assetId)) return { x: 38 + (order % 3) * 12, y: 125 + (order % 2) * 12, scale: 38, rotation: 0, opacity: 1 };
  if (/3d-/.test(assetId)) return { x: 50, y: 84, scale: 70, rotation: order % 2 ? 15 : -8, opacity: 1 };
  return { x: 42 + (order % 2) * 16, y: 70 + order * 15, scale: 60, rotation: order % 2 ? 8 : -8, opacity: 1 };
}

function elementColor(assetId: string, prompt: string, accent: string, primary = accent) {
  const lower = prompt.toLowerCase();
  if (assetId === "design-lilac-aura" || assetId === "design-cloud-ombre") return primary;
  if (assetId.includes("silver")) return "#c6cbd4";
  if (assetId.includes("gold")) return "#d7ad4d";
  if (/white/.test(lower) && /flower|french|swirl/.test(lower)) return "#fffaf7";
  return accent;
}

export function fallbackNailSpec(args: {
  prompt: string;
  shape: NailShape;
  length: NailLength;
  finish?: NailFinish;
  baseColor: string;
  referencePalette?: string[];
}): NailSetSpec {
  const { prompt, shape, length, baseColor } = args;
  const lower = prompt.toLowerCase();
  const detectedShape: NailShape = lower.includes("stiletto") ? "stiletto" : lower.includes("coffin") ? "coffin" : lower.includes("square") ? "square" : lower.includes("oval") ? "oval" : lower.includes("almond") ? "almond" : shape;
  const detectedLength: NailLength = /\bshort\b/.test(lower) ? "short" : /\blong\b/.test(lower) ? "long" : /\bmedium\b/.test(lower) ? "medium" : length;
  const primary = matchColor(prompt, args.referencePalette?.[0] ?? baseColor ?? "#f7dce5");
  const accent = args.referencePalette?.[1] ?? (/silver/.test(lower) ? "#c6cbd4" : /gold/.test(lower) ? "#d7ad4d" : "#fffaf7");
  const finish = chooseFinish(prompt, args.finish);
  const matches = matchedAssets(prompt);
  const ids = matches.ids;
  const basicOnly = /^(?:(?:a|an|the|single|one|set|nail|nails|press[ -]?on|short|medium|long|almond|oval|square|coffin|stiletto|glossy|matte|chrome|glitter|jelly|translucent|solid|plain|simple|clean|nude|beige|pink|blush|ballet|white|milky|red|cherry|burgundy|brown|chocolate|green|sage|blue|cobalt|sky|lavender|purple|black|yellow|orange|silver|gold|with|and|base|color|finish)[\s,.-]*)+$/i.test(prompt.trim());
  const strategy: RenderStrategy = matches.novel.length
    ? (ids.length ? "hybrid" : "generative")
    : ids.length
      ? "library"
      : basicOnly
        ? "library"
        : "generative";

  const nails: FingerPlan[] = FINGERS.map((finger, fingerIndex) => {
    const perFinger = ids.length
      ? ids.filter((_, assetIndex) => (assetIndex + fingerIndex) % Math.max(2, Math.min(ids.length, 3)) !== 1).slice(0, 3)
      : [];
    const picked = perFinger.length ? perFinger : (ids.length ? [ids[fingerIndex % ids.length]] : []);
    return {
      finger,
      baseColor: primary,
      finish,
      elements: picked.flatMap((assetId, index) => {
        const base = {
          assetId,
          color: elementColor(assetId, prompt, accent, primary),
          ...defaultPlacement(assetId, index),
        };
        if (assetId === "charm-rhinestone" || assetId === "charm-prism-gem") {
          return [
            { ...base, x: 38, y: 128, scale: 30 },
            { ...base, x: 50, y: 137, scale: 28 },
            { ...base, x: 62, y: 128, scale: 30 },
          ];
        }
        if (assetId === "charm-pearl-trio") return [{ ...base, x: 50, y: 132, scale: 42 }];
        return [base];
      }).slice(0, 6),
    };
  });

  const required = matches.concepts.length ? matches.concepts : [prompt.trim()].filter(Boolean);
  const forbidden = [
    "hand",
    "finger",
    "skin",
    "multiple nails",
    "plain undecorated nail",
    "plain nude nail",
    "missing requested decorations",
    "text",
    "watermark",
  ];

  return {
    shape: detectedShape,
    length: detectedLength,
    palette: [primary, accent, args.referencePalette?.[2] ?? "#f7dce5"],
    finish,
    styleTags: [
      /coquette|bow|pearl/.test(lower) ? "coquette" : "nail art",
      /minimal|clean|simple/.test(lower) ? "minimal" : "detailed",
    ],
    strategy,
    requiredConcepts: required,
    forbiddenConcepts: forbidden,
    novelConcepts: matches.novel,
    diffusionPrompt: diffusionConceptPrompt(prompt, required),
    negativePrompt: forbidden.join(", "),
    designSummary: strategy === "library"
      ? "This request can be built deterministically from editable Nuvii assets."
      : "Known Nuvii assets are combined with the trained LoRA for the novel visual details.",
    nails,
  };
}

export function normalizeNailSpec(spec: NailSetSpec, fallback: NailSetSpec): NailSetSpec {
  const safeHex = (value: string, backup: string) => /^#[0-9a-fA-F]{6}$/.test(value) ? value : backup;
  const knownIds = new Set(NUVII_ASSET_IDS);
  const plansByFinger = new Map(spec.nails.map((plan) => [plan.finger, plan]));

  return {
    ...fallback,
    ...spec,
    palette: (spec.palette?.length ? spec.palette : fallback.palette).slice(0, 5).map((color, i) => safeHex(color, fallback.palette[i % fallback.palette.length])),
    nails: FINGERS.map((finger) => {
      const plan = plansByFinger.get(finger) ?? fallback.nails.find((item) => item.finger === finger)!;
      const fallbackPlan = fallback.nails.find((item) => item.finger === finger)!;
      return {
        finger,
        baseColor: safeHex(plan.baseColor, fallbackPlan.baseColor),
        finish: plan.finish ?? fallbackPlan.finish,
        elements: (plan.elements ?? [])
          .filter((element) => knownIds.has(element.assetId as (typeof NUVII_ASSET_IDS)[number]))
          .slice(0, 6)
          .map((element, index) => ({
            assetId: element.assetId,
            color: safeHex(element.color, fallbackPlan.elements[index]?.color ?? "#ffffff"),
            x: Math.max(5, Math.min(95, Number(element.x) || 50)),
            y: Math.max(10, Math.min(170, Number(element.y) || 90)),
            scale: Math.max(20, Math.min(170, Number(element.scale) || 60)),
            rotation: Math.max(-180, Math.min(180, Number(element.rotation) || 0)),
            opacity: Math.max(0.2, Math.min(1, Number(element.opacity) || 1)),
          })),
      };
    }),
  };
}
