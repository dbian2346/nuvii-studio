"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

type NailShape = "almond" | "oval" | "square" | "coffin" | "stiletto";
type NailLength = "short" | "medium" | "long";
type NailFinish = "glossy" | "matte" | "chrome" | "glitter" | "jelly";
type InspectorTab = "color" | "shape" | "length" | "finish" | "design";
type DesignPanelMode = "library" | "edit";
type AssetKind =
  | "french-tip"
  | "daisy"
  | "blossom"
  | "star"
  | "four-point-star"
  | "moon"
  | "heart"
  | "bow"
  | "polka-dots"
  | "ombre"
  | "aura"
  | "cheetah"
  | "zebra"
  | "pearl"
  | "swirl"
  | "sparkle"
  | "checker"
  | "flame"
  | "butterfly"
  | "gem"
  | "abstract-line"
  | "bubble"
  | "raindrop"
  | "caviar"
  | "star-charm"
  | "rhinestone"
  | "chain"
  | "charm-bow"
  | "chrome-bow"
  | "organic-frame"
  | "star-trail"
  | "jewel-frame"
  | "chain-drape"
  | "image"
  | "ai-texture";

type AssetGroup = "2D" | "3D" | "Charms" | "Chrome" | "Uploads";
type MetallicTone = "gold" | "silver";

type AssetCategory =
  | "French"
  | "Gradient"
  | "Florals"
  | "Symbols"
  | "Patterns"
  | "Animal"
  | "Gel Swirls"
  | "3D Florals"
  | "Bubbles"
  | "Shells"
  | "Beads"
  | "Pearls"
  | "Gems"
  | "Chains"
  | "Bows"
  | "Gold"
  | "Silver"
  | "Uploads";

type NailDefinition = {
  id: string;
  hand: "left" | "right";
  finger: "pinky" | "ring" | "middle" | "index" | "thumb";
  label: string;
  width: number;
  height: number;
};

type AssetDefinition = {
  id: string;
  name: string;
  group: AssetGroup;
  category: AssetCategory;
  kind: AssetKind;
  defaultColor: string;
  tags: string[];
  imageData?: string;
  tintable?: boolean;
  metallic?: MetallicTone;
};

type DesignLayer = {
  id: string;
  assetId: string;
  name: string;
  kind: AssetKind;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  imageData?: string;
  tintable?: boolean;
  metallic?: MetallicTone;
};

type NailDesign = {
  baseColor: string;
  finish: NailFinish;
  layers: DesignLayer[];
};

type NailMap = Record<string, NailDesign>;

type Snapshot = {
  nails: NailMap;
  shape: NailShape;
  length: NailLength;
};

type SavedProject = Snapshot & {
  version: 1;
  projectName: string;
  savedAt: string;
  customAssets: AssetDefinition[];
};

const LEFT_HAND: NailDefinition[] = [
  { id: "left-pinky", hand: "left", finger: "pinky", label: "Pinky", width: 62, height: 128 },
  { id: "left-ring", hand: "left", finger: "ring", label: "Ring", width: 64, height: 131 },
  { id: "left-middle", hand: "left", finger: "middle", label: "Middle", width: 66, height: 134 },
  { id: "left-index", hand: "left", finger: "index", label: "Index", width: 65, height: 132 },
  { id: "left-thumb", hand: "left", finger: "thumb", label: "Thumb", width: 68, height: 135 },
];

const RIGHT_HAND: NailDefinition[] = [
  { id: "right-thumb", hand: "right", finger: "thumb", label: "Thumb", width: 68, height: 135 },
  { id: "right-index", hand: "right", finger: "index", label: "Index", width: 65, height: 132 },
  { id: "right-middle", hand: "right", finger: "middle", label: "Middle", width: 66, height: 134 },
  { id: "right-ring", hand: "right", finger: "ring", label: "Ring", width: 64, height: 131 },
  { id: "right-pinky", hand: "right", finger: "pinky", label: "Pinky", width: 62, height: 128 },
];

const ALL_NAILS = [...LEFT_HAND, ...RIGHT_HAND];
const FINGERS = ["pinky", "ring", "middle", "index", "thumb"] as const;

const BASE_COLORS = [
  { name: "Ballet", value: "#f7dce5" },
  { name: "Blush", value: "#efbfd0" },
  { name: "Milky", value: "#fffaf7" },
  { name: "Cream", value: "#f2e6d5" },
  { name: "Cherry", value: "#95163d" },
  { name: "Chocolate", value: "#61392f" },
  { name: "Sage", value: "#a9b89e" },
  { name: "Sky", value: "#acd4e8" },
  { name: "Lavender", value: "#c8b6df" },
  { name: "Black", value: "#252525" },
  { name: "Butter", value: "#f4dfa0" },
  { name: "Tangerine", value: "#ef8f62" },
];

const STATIC_ASSETS: AssetDefinition[] = [
  // 2D art
  { id: "french-tip", name: "Classic French", group: "2D", category: "French", kind: "french-tip", defaultColor: "#ffffff", tags: ["french", "tip", "smile line", "rounded", "classic"] },
  { id: "bow", name: "Ribbon Bow", group: "2D", category: "Symbols", kind: "bow", defaultColor: "#ffffff", tags: ["bow", "ribbon", "coquette", "cute"] },
  { id: "polka-dots", name: "Polka Dots", group: "2D", category: "Patterns", kind: "polka-dots", defaultColor: "#ffffff", tags: ["dots", "polka", "retro", "spot"] },
  { id: "ombre", name: "Soft Ombré", group: "2D", category: "Gradient", kind: "ombre", defaultColor: "#f2a5c7", tags: ["ombre", "gradient", "fade", "soft"] },
  { id: "aura", name: "Aura Glow", group: "2D", category: "Gradient", kind: "aura", defaultColor: "#d596e8", tags: ["aura", "halo", "center glow", "gradient"] },
  { id: "daisy", name: "Daisy", group: "2D", category: "Florals", kind: "daisy", defaultColor: "#ffffff", tags: ["flower", "floral", "daisy", "spring"] },
  { id: "blossom", name: "Five-Petal Bloom", group: "2D", category: "Florals", kind: "blossom", defaultColor: "#f6a8bd", tags: ["flower", "floral", "blossom", "pink"] },
  { id: "swirl", name: "Fine Swirl", group: "2D", category: "Patterns", kind: "swirl", defaultColor: "#ffffff", tags: ["swirl", "line", "abstract", "minimal"] },
  { id: "abstract-line", name: "Abstract Line", group: "2D", category: "Patterns", kind: "abstract-line", defaultColor: "#ffffff", tags: ["abstract", "line", "wave", "modern"] },
  { id: "star", name: "Classic Star", group: "2D", category: "Symbols", kind: "star", defaultColor: "#f3c75f", tags: ["star", "celestial", "gold"] },
  { id: "four-point-star", name: "Four-Point Sparkle", group: "2D", category: "Symbols", kind: "four-point-star", defaultColor: "#ffffff", tags: ["four point", "sparkle", "star", "shine"] },
  { id: "heart", name: "Heart", group: "2D", category: "Symbols", kind: "heart", defaultColor: "#d95b7e", tags: ["heart", "love", "romantic"] },
  { id: "moon", name: "Crescent Moon", group: "2D", category: "Symbols", kind: "moon", defaultColor: "#f4d77d", tags: ["moon", "celestial", "night"] },
  { id: "sparkle", name: "Sparkle Cluster", group: "2D", category: "Symbols", kind: "sparkle", defaultColor: "#ffffff", tags: ["sparkle", "star", "shine"] },
  { id: "cheetah", name: "Cheetah Print", group: "2D", category: "Animal", kind: "cheetah", defaultColor: "#5a2d24", tags: ["cheetah", "leopard", "animal print", "spots"] },
  { id: "zebra", name: "Zebra Print", group: "2D", category: "Animal", kind: "zebra", defaultColor: "#1f1c27", tags: ["zebra", "animal print", "stripe"] },
  { id: "checker", name: "Checker", group: "2D", category: "Patterns", kind: "checker", defaultColor: "#ffffff", tags: ["checker", "pattern", "retro"] },
  { id: "flame", name: "Flame", group: "2D", category: "Symbols", kind: "flame", defaultColor: "#f05b43", tags: ["flame", "fire", "bold"] },
  { id: "butterfly", name: "Butterfly", group: "2D", category: "Symbols", kind: "butterfly", defaultColor: "#d5b6ef", tags: ["butterfly", "y2k", "cute"] },

  // Original transparent 3D-inspired PNG elements
  { id: "3d-ribbon-swirl", name: "Sculpted Ribbon Swirl", group: "3D", category: "Gel Swirls", kind: "image", defaultColor: "#f4a9cf", tags: ["3d", "gel", "swirl", "ribbon", "relief"], imageData: "/assets/3d/sculpted-ribbon-swirl.png", tintable: true },
  { id: "3d-petal-relief", name: "Petal Relief", group: "3D", category: "Gel Swirls", kind: "image", defaultColor: "#f5bfd6", tags: ["3d", "petal", "swirl", "relief"], imageData: "/assets/3d/petal-relief.png", tintable: true },
  { id: "3d-orchid", name: "Sculpted Orchid", group: "3D", category: "3D Florals", kind: "image", defaultColor: "#ef9fc3", tags: ["3d", "flower", "orchid", "floral"], imageData: "/assets/3d/sculpted-orchid.png", tintable: true },
  { id: "3d-petal-fan", name: "Petal Fan", group: "3D", category: "3D Florals", kind: "image", defaultColor: "#f3a6c3", tags: ["3d", "flower", "fan", "petal"], imageData: "/assets/3d/petal-fan-relief.png", tintable: true },
  { id: "3d-botanical", name: "Botanical Relief", group: "3D", category: "3D Florals", kind: "image", defaultColor: "#7cc89e", tags: ["3d", "botanical", "leaf", "floral"], imageData: "/assets/3d/botanical-relief.png", tintable: true },
  { id: "3d-bubbles", name: "Gel Bubbles", group: "3D", category: "Bubbles", kind: "image", defaultColor: "#b9c8ff", tags: ["3d", "bubble", "water", "droplet"], imageData: "/assets/3d/gel-bubbles.png", tintable: true },
  { id: "3d-raindrop-fan", name: "Raindrop Fan", group: "3D", category: "Bubbles", kind: "image", defaultColor: "#63cfc7", tags: ["3d", "raindrop", "bubble", "water"], imageData: "/assets/3d/raindrop-fan.png", tintable: true },
  { id: "3d-gel-ripple", name: "Layered Gel Ripple", group: "3D", category: "Gel Swirls", kind: "image", defaultColor: "#ef8fbe", tags: ["3d", "gel", "ripple", "swirl", "raised"], imageData: "/assets/3d/gel-ripple-wave.png", tintable: true },
  { id: "3d-gel-bow", name: "Puffed Gel Bow", group: "3D", category: "3D Florals", kind: "image", defaultColor: "#ef9fc7", tags: ["3d", "gel", "bow", "coquette", "raised"], imageData: "/assets/3d/gel-bow-relief.png", tintable: true },
  { id: "3d-layered-wing", name: "Layered Petal Wing", group: "3D", category: "Gel Swirls", kind: "image", defaultColor: "#ef95bd", tags: ["3d", "petal", "wing", "ripple", "raised"], imageData: "/assets/3d/layered-petal-wing.png", tintable: true },
  { id: "3d-puffed-flower", name: "Puffed Flower Relief", group: "3D", category: "3D Florals", kind: "image", defaultColor: "#ef9fc3", tags: ["3d", "flower", "puffed", "floral", "raised"], imageData: "/assets/3d/puffed-flower-relief.png", tintable: true },
  { id: "3d-shell-spiral", name: "Pearlescent Shell Spiral", group: "3D", category: "Shells", kind: "image", defaultColor: "#f5f0e7", tags: ["3d", "shell", "spiral", "pearl", "ocean"], imageData: "/assets/3d/shell-spiral-pearlescent.png", tintable: true },
  { id: "3d-shell", name: "Pearl Shell Relief", group: "3D", category: "Shells", kind: "image", defaultColor: "#f8f4eb", tags: ["3d", "shell", "seashell", "pearl", "ocean"], imageData: "/assets/3d/shell-relief.png", tintable: true },
  { id: "bubble-outline", name: "Bubble Trio", group: "3D", category: "Bubbles", kind: "bubble", defaultColor: "#c8dcff", tags: ["bubble", "3d", "water", "gel"] },
  { id: "raindrop", name: "Raised Raindrop", group: "3D", category: "Bubbles", kind: "raindrop", defaultColor: "#b8e3f2", tags: ["raindrop", "droplet", "3d", "water"] },

  // Charms
  { id: "pearl", name: "Single Pearl", group: "Charms", category: "Pearls", kind: "pearl", defaultColor: "#fffaf0", tags: ["pearl", "cluster", "bridal", "charm"] },
  { id: "gem", name: "Crystal Gem", group: "Charms", category: "Gems", kind: "gem", defaultColor: "#bde9f1", tags: ["gem", "crystal", "charm"] },
  { id: "rhinestone", name: "Rhinestone", group: "Charms", category: "Gems", kind: "rhinestone", defaultColor: "#e5f7ff", tags: ["rhinestone", "crystal", "bling"] },
  { id: "caviar-gold", name: "Gold Caviar Bead", group: "Charms", category: "Beads", kind: "caviar", defaultColor: "#d6aa48", tags: ["caviar", "microbead", "gold", "bead"], metallic: "gold" },
  { id: "caviar-silver", name: "Silver Caviar Bead", group: "Charms", category: "Beads", kind: "caviar", defaultColor: "#d5dbe3", tags: ["caviar", "microbead", "silver", "bead"], metallic: "silver" },
  { id: "star-charm-gold", name: "Gold Star Charm", group: "Charms", category: "Gems", kind: "star-charm", defaultColor: "#d6aa48", tags: ["star", "charm", "gold"], metallic: "gold" },
  { id: "star-charm-silver", name: "Silver Star Charm", group: "Charms", category: "Gems", kind: "star-charm", defaultColor: "#d5dbe3", tags: ["star", "charm", "silver"], metallic: "silver" },
  { id: "chain-gold", name: "Gold Chain", group: "Charms", category: "Chains", kind: "chain", defaultColor: "#d6aa48", tags: ["chain", "gold", "jewelry"], metallic: "gold" },
  { id: "chain-silver", name: "Silver Chain", group: "Charms", category: "Chains", kind: "chain", defaultColor: "#d5dbe3", tags: ["chain", "silver", "jewelry"], metallic: "silver" },
  { id: "charm-bow-gold", name: "Gold Bow Charm", group: "Charms", category: "Bows", kind: "charm-bow", defaultColor: "#d6aa48", tags: ["bow", "charm", "gold", "coquette"], metallic: "gold" },
  { id: "charm-bow-silver", name: "Silver Bow Charm", group: "Charms", category: "Bows", kind: "charm-bow", defaultColor: "#d5dbe3", tags: ["bow", "charm", "silver", "coquette"], metallic: "silver" },
  { id: "jewel-frame-gold", name: "Gold Jewel Frame", group: "Charms", category: "Gems", kind: "jewel-frame", defaultColor: "#d6aa48", tags: ["jewel", "frame", "gem", "gold", "statement"], metallic: "gold" },
  { id: "jewel-frame-silver", name: "Silver Jewel Frame", group: "Charms", category: "Gems", kind: "jewel-frame", defaultColor: "#d5dbe3", tags: ["jewel", "frame", "gem", "silver", "statement"], metallic: "silver" },
  { id: "chain-drape-gold", name: "Gold Chain Drape", group: "Charms", category: "Chains", kind: "chain-drape", defaultColor: "#d6aa48", tags: ["chain", "drape", "gold", "jewelry"], metallic: "gold" },
  { id: "chain-drape-silver", name: "Silver Chain Drape", group: "Charms", category: "Chains", kind: "chain-drape", defaultColor: "#d5dbe3", tags: ["chain", "drape", "silver", "jewelry"], metallic: "silver" },

  // Isolated chrome elements
  { id: "chrome-swirl-gold", name: "Gold Chrome Swirl", group: "Chrome", category: "Gold", kind: "swirl", defaultColor: "#d6aa48", tags: ["isolated chrome", "gold", "swirl", "3d"], metallic: "gold" },
  { id: "chrome-swirl-silver", name: "Silver Chrome Swirl", group: "Chrome", category: "Silver", kind: "swirl", defaultColor: "#d5dbe3", tags: ["isolated chrome", "silver", "swirl", "3d"], metallic: "silver" },
  { id: "chrome-star-gold", name: "Gold Chrome Sparkle", group: "Chrome", category: "Gold", kind: "four-point-star", defaultColor: "#d6aa48", tags: ["chrome", "gold", "star", "sparkle"], metallic: "gold" },
  { id: "chrome-star-silver", name: "Silver Chrome Sparkle", group: "Chrome", category: "Silver", kind: "four-point-star", defaultColor: "#d5dbe3", tags: ["chrome", "silver", "star", "sparkle"], metallic: "silver" },
  { id: "chrome-heart-gold", name: "Gold Chrome Heart", group: "Chrome", category: "Gold", kind: "heart", defaultColor: "#d6aa48", tags: ["chrome", "gold", "heart"], metallic: "gold" },
  { id: "chrome-heart-silver", name: "Silver Chrome Heart", group: "Chrome", category: "Silver", kind: "heart", defaultColor: "#d5dbe3", tags: ["chrome", "silver", "heart"], metallic: "silver" },
  { id: "chrome-flower-gold", name: "Gold Chrome Flower", group: "Chrome", category: "Gold", kind: "blossom", defaultColor: "#d6aa48", tags: ["chrome", "gold", "flower"], metallic: "gold" },
  { id: "chrome-flower-silver", name: "Silver Chrome Flower", group: "Chrome", category: "Silver", kind: "blossom", defaultColor: "#d5dbe3", tags: ["chrome", "silver", "flower"], metallic: "silver" },
  { id: "chrome-bow-gold", name: "Gold Outline Bow", group: "Chrome", category: "Gold", kind: "chrome-bow", defaultColor: "#d6aa48", tags: ["chrome", "gold", "bow", "outline", "coquette"], metallic: "gold" },
  { id: "chrome-bow-silver", name: "Silver Outline Bow", group: "Chrome", category: "Silver", kind: "chrome-bow", defaultColor: "#d5dbe3", tags: ["chrome", "silver", "bow", "outline", "coquette"], metallic: "silver" },
  { id: "chrome-frame-gold", name: "Gold Organic Frame", group: "Chrome", category: "Gold", kind: "organic-frame", defaultColor: "#d6aa48", tags: ["chrome", "gold", "frame", "molten", "outline"], metallic: "gold" },
  { id: "chrome-frame-silver", name: "Silver Organic Frame", group: "Chrome", category: "Silver", kind: "organic-frame", defaultColor: "#d5dbe3", tags: ["chrome", "silver", "frame", "molten", "outline"], metallic: "silver" },
  { id: "chrome-star-trail-gold", name: "Gold Star Trail", group: "Chrome", category: "Gold", kind: "star-trail", defaultColor: "#d6aa48", tags: ["chrome", "gold", "star", "trail", "celestial"], metallic: "gold" },
  { id: "chrome-star-trail-silver", name: "Silver Star Trail", group: "Chrome", category: "Silver", kind: "star-trail", defaultColor: "#d5dbe3", tags: ["chrome", "silver", "star", "trail", "celestial"], metallic: "silver" },
];

const SHAPE_PATHS: Record<NailShape, string> = {
  almond:
    "M50 4 C31 4 20 13 17 34 C13 67 18 111 29 148 C35 166 42 176 50 179 C58 176 65 166 71 148 C82 111 87 67 83 34 C80 13 69 4 50 4 Z",
  oval:
    "M50 4 C31 4 20 13 17 34 C13 68 14 117 23 150 C28 169 38 178 50 179 C62 178 72 169 77 150 C86 117 87 68 83 34 C80 13 69 4 50 4 Z",
  square:
    "M50 4 C31 4 20 13 17 34 L21 164 Q22 176 33 178 L67 178 Q78 176 79 164 L83 34 C80 13 69 4 50 4 Z",
  coffin:
    "M50 4 C31 4 20 13 17 34 L29 164 Q30 176 39 178 L61 178 Q70 176 71 164 L83 34 C80 13 69 4 50 4 Z",
  stiletto:
    "M50 4 C31 4 20 13 17 34 C13 70 20 113 34 151 C40 168 47 178 50 180 C53 178 60 168 66 151 C80 113 87 70 83 34 C80 13 69 4 50 4 Z",
};

const COLOR_WORDS: Record<string, string> = {
  pink: "#efbfd0",
  blush: "#efbfd0",
  rose: "#d989a4",
  red: "#b52a48",
  cherry: "#95163d",
  burgundy: "#6f1732",
  wine: "#6f1732",
  white: "#fffaf7",
  milky: "#fffaf7",
  cream: "#f2e6d5",
  nude: "#d9b9a1",
  beige: "#d8c4ac",
  brown: "#70463a",
  chocolate: "#61392f",
  black: "#252525",
  blue: "#8ebfd8",
  sky: "#acd4e8",
  navy: "#263651",
  purple: "#a68ac4",
  lavender: "#c8b6df",
  lilac: "#c8b6df",
  green: "#8faa83",
  sage: "#a9b89e",
  yellow: "#f2d66d",
  butter: "#f4dfa0",
  orange: "#ef8f62",
  coral: "#ec806f",
  gold: "#d7ad4d",
  silver: "#c7ced6",
  grey: "#9da3aa",
  gray: "#9da3aa",
};

const LENGTH_FACTORS: Record<NailLength, number> = {
  short: 0.82,
  medium: 1,
  long: 1.18,
};

const SHAPE_WIDTH_FACTORS: Record<NailShape, number> = {
  almond: 1,
  oval: 1.03,
  square: 1.08,
  coffin: 1.05,
  stiletto: 0.95,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialNails(): NailMap {
  return Object.fromEntries(
    ALL_NAILS.map((nail) => [
      nail.id,
      {
        baseColor: "#f7dce5",
        finish: "glossy" as NailFinish,
        layers: [],
      },
    ])
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((character) => character + character)
        .join("")
    : normalized.padEnd(6, "0").slice(0, 6);

  const number = Number.parseInt(safe, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(color: string, target: string, amount: number) {
  const first = hexToRgb(color);
  const second = hexToRgb(target);
  return rgbToHex(
    first.r + (second.r - first.r) * amount,
    first.g + (second.g - first.g) * amount,
    first.b + (second.b - first.b) * amount
  );
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function maskGeneratedArtworkToNail(
  dataURI: string,
  shape: NailShape
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 1080;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Your browser could not prepare the generated nail artwork."));
        return;
      }

      const targetRatio = canvas.width / canvas.height;
      const sourceRatio = image.naturalWidth / image.naturalHeight;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight * targetRatio;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = image.naturalWidth / targetRatio;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
      }

      context.save();
      context.scale(canvas.width / 100, canvas.height / 180);
      context.clip(new Path2D(SHAPE_PATHS[shape]));
      context.scale(100 / canvas.width, 180 / canvas.height);

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.restore();
      resolve(canvas.toDataURL("image/png"));
    };

    image.onerror = () => {
      reject(new Error("The generated image could not be converted into a press-on nail."));
    };

    image.src = dataURI;
  });
}

function makeLayer(asset: AssetDefinition, overrides: Partial<DesignLayer> = {}): DesignLayer {
  const placement = asset.kind === "french-tip"
    ? { x: 50, y: 150, scale: 100 }
    : asset.kind === "ombre" || asset.kind === "aura" || asset.kind === "cheetah" || asset.kind === "zebra" || asset.kind === "polka-dots"
      ? { x: 50, y: 92, scale: 118 }
      : { x: 50, y: 92, scale: 100 };

  return {
    id: makeId("layer"),
    assetId: asset.id,
    name: asset.name,
    kind: asset.kind,
    color: asset.defaultColor,
    x: placement.x,
    y: placement.y,
    scale: placement.scale,
    rotation: 0,
    opacity: 1,
    imageData: asset.imageData,
    tintable: asset.tintable,
    metallic: asset.metallic,
    ...overrides,
  };
}

function getAssetSize(kind: AssetKind) {
  if (kind === "french-tip") return { width: 96, height: 52 };
  if (["ombre", "aura", "polka-dots", "cheetah", "zebra"].includes(kind)) return { width: 92, height: 142 };
  if (["swirl", "abstract-line", "chain", "chrome-bow", "organic-frame", "star-trail", "jewel-frame", "chain-drape"].includes(kind)) return { width: 82, height: 82 };
  if (kind === "checker") return { width: 72, height: 72 };
  if (kind === "ai-texture") return { width: 100, height: 180 };
  if (kind === "image") return { width: 86, height: 86 };
  if (["bubble", "raindrop", "caviar", "star-charm", "rhinestone", "charm-bow"].includes(kind)) return { width: 64, height: 64 };
  return { width: 58, height: 58 };
}

function AssetGraphic({ layer }: { layer: DesignLayer }) {
  const assetPaint = layer.metallic === "gold"
    ? "url(#nuvii-gold-metal)"
    : layer.metallic === "silver"
      ? "url(#nuvii-silver-metal)"
      : layer.color;
  const localId = layer.id.replace(/[^a-zA-Z0-9_-]/g, "");
  const commonStroke = {
    stroke: assetPaint,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (layer.kind) {
    case "french-tip":
      return (
        <path
          d="M-48 -13 Q0 20 48 -13 L48 42 Q0 50 -48 42 Z"
          fill={assetPaint}
        />
      );
    case "polka-dots":
      return (
        <g fill={assetPaint}>
          {[-30, -10, 10, 30].flatMap((x) =>
            [-54, -28, -2, 24, 50].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" />
            ))
          )}
        </g>
      );
    case "ombre":
      return (
        <g>
          <defs>
            <linearGradient id={`ombre-${localId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={assetPaint} stopOpacity="0" />
              <stop offset="45%" stopColor={assetPaint} stopOpacity="0.24" />
              <stop offset="100%" stopColor={assetPaint} stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <rect x="-46" y="-72" width="92" height="144" rx="38" fill={`url(#ombre-${localId})`} />
        </g>
      );
    case "aura":
      return (
        <g>
          <defs>
            <radialGradient id={`aura-${localId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={assetPaint} stopOpacity="0.98" />
              <stop offset="46%" stopColor={assetPaint} stopOpacity="0.62" />
              <stop offset="100%" stopColor={assetPaint} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="0" cy="0" rx="45" ry="68" fill={`url(#aura-${localId})`} />
        </g>
      );
    case "cheetah":
      return (
        <g fill="none" stroke={assetPaint} strokeWidth="5" strokeLinecap="round">
          <path d="M-31 -47 C-43 -39 -39 -23 -24 -23 C-10 -23 -5 -37 -15 -46" />
          <path d="M8 -38 C20 -48 36 -38 33 -23 C29 -10 14 -8 8 -18" />
          <path d="M-9 -3 C-22 -15 -38 -5 -35 11 C-31 25 -15 25 -8 14" />
          <path d="M18 9 C32 -1 43 11 38 26 C34 38 18 38 12 28" />
          <path d="M-25 39 C-13 29 2 38 0 53 C-3 65 -17 67 -25 57" />
          <circle cx="2" cy="-25" r="4" fill={assetPaint} stroke="none" />
          <circle cx="-3" cy="30" r="5" fill={assetPaint} stroke="none" />
        </g>
      );
    case "zebra":
      return (
        <g fill="none" stroke={assetPaint} strokeWidth="7" strokeLinecap="round">
          <path d="M-43 -56 C-15 -43 -16 -24 -1 -13" />
          <path d="M39 -48 C15 -35 19 -19 3 -8" />
          <path d="M-42 -18 C-15 -7 -18 12 -1 22" />
          <path d="M42 3 C17 13 20 30 4 41" />
          <path d="M-39 31 C-17 38 -19 55 -6 65" />
        </g>
      );
    case "four-point-star":
      return (
        <path d="M0 -34 C4 -10 10 -4 34 0 C10 4 4 10 0 34 C-4 10 -10 4 -34 0 C-10 -4 -4 -10 0 -34 Z" fill={assetPaint} />
      );
    case "daisy":
      return (
        <g>
          <ellipse cx="0" cy="-17" rx="10" ry="16" fill={assetPaint} />
          <ellipse cx="16" cy="-5" rx="10" ry="16" transform="rotate(72 16 -5)" fill={assetPaint} />
          <ellipse cx="10" cy="14" rx="10" ry="16" transform="rotate(144 10 14)" fill={assetPaint} />
          <ellipse cx="-10" cy="14" rx="10" ry="16" transform="rotate(216 -10 14)" fill={assetPaint} />
          <ellipse cx="-16" cy="-5" rx="10" ry="16" transform="rotate(288 -16 -5)" fill={assetPaint} />
          <circle r="8" fill="#f2c85f" />
        </g>
      );
    case "blossom":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={angle}
              d="M0 -2 C-12 -13 -10 -29 0 -31 C10 -29 12 -13 0 -2 Z"
              fill={assetPaint}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r="6" fill="#f7d58a" />
        </g>
      );
    case "star":
      return (
        <path
          d="M0 -30 L7 -9 L29 -9 L11 4 L18 26 L0 13 L-18 26 L-11 4 L-29 -9 L-7 -9 Z"
          fill={assetPaint}
        />
      );
    case "moon":
      return (
        <path
          d="M17 -29 C-5 -27 -20 -10 -18 10 C-16 28 2 37 18 28 C4 25 -5 14 -5 1 C-5 -12 4 -24 17 -29 Z"
          fill={assetPaint}
        />
      );
    case "heart":
      return (
        <path
          d="M0 27 C-7 18 -27 5 -27 -10 C-27 -24 -9 -31 0 -18 C9 -31 27 -24 27 -10 C27 5 7 18 0 27 Z"
          fill={assetPaint}
        />
      );
    case "bow":
      return (
        <g fill={assetPaint}>
          <path d="M-5 -3 C-17 -25 -37 -25 -35 -5 C-34 12 -17 11 -5 4 Z" />
          <path d="M5 -3 C17 -25 37 -25 35 -5 C34 12 17 11 5 4 Z" />
          <circle r="7" />
          <path d="M-3 5 L-15 31 L0 22 L4 6 Z" />
          <path d="M3 5 L15 31 L0 22 L-4 6 Z" />
        </g>
      );
    case "pearl":
      return (
        <g>
          <defs>
            <radialGradient id={`pearl-${localId}`} cx="32%" cy="26%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="36%" stopColor={mixHex(layer.color, "#ffffff", 0.7)} />
              <stop offset="100%" stopColor={mixHex(layer.color, "#b8a6c6", 0.2)} />
            </radialGradient>
          </defs>
          <circle cx="0" cy="0" r="18" fill={`url(#pearl-${localId})`} stroke={mixHex(layer.color, "#8e8297", 0.3)} strokeWidth="1.4" />
          <ellipse cx="-6" cy="-7" rx="6" ry="4" fill="#ffffff" opacity="0.78" />
        </g>
      );
    case "swirl":
      return (
        <g fill="none" {...commonStroke} strokeWidth="6">
          <path d="M-31 17 C-7 -21 15 -26 31 -7 C43 8 29 25 12 18 C-1 13 0 -1 10 -4" />
          <path d="M-24 -18 C-10 -5 -6 10 -12 28" strokeWidth="4" />
        </g>
      );
    case "sparkle":
      return (
        <g fill={assetPaint}>
          <path d="M0 -31 C3 -10 9 -3 30 0 C9 3 3 10 0 31 C-3 10 -9 3 -30 0 C-9 -3 -3 -10 0 -31 Z" />
          <path d="M23 -25 C25 -15 29 -11 39 -9 C29 -7 25 -3 23 7 C21 -3 17 -7 7 -9 C17 -11 21 -15 23 -25 Z" opacity="0.8" />
        </g>
      );
    case "checker":
      return (
        <g>
          {[-30, -10, 10].flatMap((x, column) =>
            [-30, -10, 10].map((y, row) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="20"
                height="20"
                rx="2"
                fill={(column + row) % 2 === 0 ? layer.color : "#ffffff"}
                opacity={(column + row) % 2 === 0 ? 1 : 0.45}
              />
            ))
          )}
        </g>
      );
    case "flame":
      return (
        <path
          d="M2 31 C-23 20 -25 -1 -9 -19 C-7 -7 -1 -3 3 -12 C8 -24 1 -31 13 -38 C14 -23 30 -12 28 7 C27 22 16 31 2 31 Z"
          fill={assetPaint}
        />
      );
    case "butterfly":
      return (
        <g fill={assetPaint} stroke={mixHex(layer.color, "#3b254b", 0.45)} strokeWidth="2">
          <path d="M-4 -2 C-18 -31 -39 -25 -34 -5 C-31 8 -17 12 -5 5 Z" />
          <path d="M4 -2 C18 -31 39 -25 34 -5 C31 8 17 12 5 5 Z" />
          <path d="M-5 6 C-22 8 -29 26 -14 30 C-5 32 -2 20 0 9 Z" />
          <path d="M5 6 C22 8 29 26 14 30 C5 32 2 20 0 9 Z" />
          <ellipse cx="0" cy="4" rx="4" ry="16" fill="#4a354f" />
          <path d="M-2 -11 Q-10 -22 -15 -18 M2 -11 Q10 -22 15 -18" fill="none" />
        </g>
      );
    case "gem":
      return (
        <g stroke={mixHex(layer.color, "#35576b", 0.45)} strokeWidth="2">
          <path d="M0 -31 L25 -16 L31 9 L13 31 L-13 31 L-31 9 L-25 -16 Z" fill={assetPaint} />
          <path d="M0 -31 L8 -9 L31 9 M0 -31 L-8 -9 L-31 9 M-8 -9 L8 -9 L13 31 M-8 -9 L-13 31" fill="none" opacity="0.65" />
        </g>
      );
    case "abstract-line":
      return (
        <g fill="none" {...commonStroke} strokeWidth="5">
          <path d="M-31 24 C-10 -6 -16 -27 5 -31 C24 -35 35 -17 23 0 C10 19 16 29 32 28" />
          <circle cx="-20" cy="-17" r="4" fill={assetPaint} stroke="none" />
        </g>
      );
    case "bubble":
      return (
        <g fill={assetPaint} fillOpacity="0.25" stroke="#ffffff" strokeWidth="3">
          <circle cx="-14" cy="8" r="17" />
          <circle cx="16" cy="-13" r="13" />
          <circle cx="20" cy="22" r="9" />
          <circle cx="-25" cy="-22" r="8" />
        </g>
      );
    case "raindrop":
      return (
        <path d="M0 -33 C18 -10 27 2 25 17 C23 34 12 42 0 42 C-12 42 -23 34 -25 17 C-27 2 -18 -10 0 -33 Z" fill={assetPaint} fillOpacity="0.42" stroke="#ffffff" strokeWidth="4" />
      );
    case "caviar":
      return (
        <g>
          <circle cx="0" cy="0" r="17" fill={assetPaint} stroke={mixHex(layer.color, "#ffffff", 0.4)} strokeWidth="1.4" />
          <circle cx="-5" cy="-6" r="5" fill="#ffffff" opacity="0.5" />
        </g>
      );
    case "star-charm":
      return (
        <g>
          <path d="M0 -30 L8 -9 L30 -9 L12 4 L19 27 L0 14 L-19 27 L-12 4 L-30 -9 L-8 -9 Z" fill={assetPaint} stroke="#fff7d5" strokeWidth="2" />
          <circle cx="0" cy="0" r="6" fill="#fff8cf" opacity="0.75" />
        </g>
      );
    case "rhinestone":
      return (
        <g stroke="#ffffff" strokeWidth="2">
          <path d="M0 -31 L25 -18 L31 7 L14 30 L-14 30 L-31 7 L-25 -18 Z" fill={assetPaint} />
          <path d="M0 -31 L8 -7 L31 7 M0 -31 L-8 -7 L-31 7 M-8 -7 L8 -7 L14 30 M-8 -7 L-14 30" fill="none" opacity="0.8" />
        </g>
      );
    case "chain":
      return (
        <g fill="none" stroke={assetPaint} strokeWidth="7">
          {[-24,-8,8,24].map((x) => <ellipse key={x} cx={x} cy={x * 0.35} rx="14" ry="9" transform={`rotate(-28 ${x} ${x * 0.35})`} />)}
        </g>
      );
    case "charm-bow":
      return (
        <g fill={assetPaint} stroke="#fff7d5" strokeWidth="2">
          <path d="M-4 -2 C-18 -25 -39 -24 -35 -3 C-32 13 -16 11 -4 5 Z" />
          <path d="M4 -2 C18 -25 39 -24 35 -3 C32 13 16 11 4 5 Z" />
          <circle r="8" />
          <path d="M-3 6 L-15 31 L0 23 L4 7 Z" />
          <path d="M3 6 L15 31 L0 23 L-4 7 Z" />
        </g>
      );
    case "chrome-bow":
      return (
        <g fill="none" stroke={assetPaint} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-3 0 C-17 -28 -40 -25 -36 -4 C-33 12 -17 13 -3 5" />
          <path d="M3 0 C17 -28 40 -25 36 -4 C33 12 17 13 3 5" />
          <circle r="7" fill={assetPaint} stroke="none" />
          <path d="M-4 7 C-10 17 -15 25 -19 34 M4 7 C10 17 15 25 19 34" />
        </g>
      );
    case "organic-frame":
      return (
        <path d="M-24 -35 C-4 -44 28 -30 31 -9 C34 8 21 13 26 29 C13 40 -12 39 -29 25 C-22 11 -37 -2 -31 -17 C-28 -24 -29 -30 -24 -35 Z" fill="none" stroke={assetPaint} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      );
    case "star-trail":
      return (
        <g fill={assetPaint} stroke={assetPaint} strokeLinecap="round">
          <path d="M-28 30 C-12 13 -10 -8 5 -22" fill="none" strokeWidth="4" />
          <path d="M4 -34 C7 -17 12 -12 29 -9 C12 -6 7 -1 4 16 C1 -1 -4 -6 -21 -9 C-4 -12 1 -17 4 -34 Z" />
          <path d="M-21 14 C-19 4 -15 0 -5 -2 C-15 -4 -19 -8 -21 -18 C-23 -8 -27 -4 -37 -2 C-27 0 -23 4 -21 14 Z" transform="scale(.62) translate(-10 20)" />
        </g>
      );
    case "jewel-frame":
      return (
        <g>
          <path d="M-25 -33 C-7 -41 17 -38 29 -22 C36 -8 27 4 31 18 C21 35 -6 42 -26 28 C-34 12 -25 1 -32 -12 C-34 -22 -31 -29 -25 -33 Z" fill="none" stroke={assetPaint} strokeWidth="6" strokeLinecap="round" />
          {[[-25,-20],[20,-26],[28,10],[8,33],[-24,20]].map(([cx,cy], index) => <circle key={index} cx={cx} cy={cy} r="5" fill="#f7fbff" stroke={assetPaint} strokeWidth="2" />)}
        </g>
      );
    case "chain-drape":
      return (
        <g fill="none" stroke={assetPaint} strokeWidth="4">
          <path d="M-34 -18 Q0 34 34 -18" strokeWidth="2" opacity="0.75" />
          {[-30,-20,-10,0,10,20,30].map((x) => { const y = -18 + (1 - Math.pow(x / 34, 2)) * 42; return <circle key={x} cx={x} cy={y} r="5.5" fill={assetPaint} stroke="#fff6d0" strokeWidth="1" />; })}
        </g>
      );
    case "ai-texture":
      if (!layer.imageData) return null;
      return (
        <image
          href={layer.imageData}
          x="-50"
          y="-90"
          width="100"
          height="180"
          preserveAspectRatio="xMidYMid slice"
        />
      );
    case "image":
      if (!layer.imageData) return null;
      if (!layer.tintable) {
        return <image href={layer.imageData} x="-43" y="-43" width="86" height="86" preserveAspectRatio="xMidYMid meet" />;
      }
      return (
        <g>
          <defs>
            <mask id={`image-mask-${localId}`}>
              <image href={layer.imageData} x="-43" y="-43" width="86" height="86" preserveAspectRatio="xMidYMid meet" />
            </mask>
          </defs>
          <rect x="-43" y="-43" width="86" height="86" fill={layer.color} mask={`url(#image-mask-${localId})`} />
          <image href={layer.imageData} x="-43" y="-43" width="86" height="86" preserveAspectRatio="xMidYMid meet" opacity="0.55" style={{ mixBlendMode: "screen" }} />
        </g>
      );
    default:
      return null;
  }
}

function NailSvgContent({
  design,
  shape,
  uniqueId,
  selectedLayerId,
  interactive = false,
  onLayerPointerDown,
  onLayerResizePointerDown,
}: {
  design: NailDesign;
  shape: NailShape;
  uniqueId: string;
  selectedLayerId?: string | null;
  interactive?: boolean;
  onLayerPointerDown?: (
    event: ReactPointerEvent<SVGGElement>,
    layer: DesignLayer
  ) => void;
  onLayerResizePointerDown?: (
    event: ReactPointerEvent<SVGCircleElement>,
    layer: DesignLayer,
    corner: "nw" | "ne" | "sw" | "se"
  ) => void;
}) {
  const path = SHAPE_PATHS[shape];
  const clipId = `clip-${uniqueId}`;
  const chromeId = `chrome-${uniqueId}`;
  const glitterId = `glitter-${uniqueId}`;
  const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  const baseFill = design.finish === "chrome" ? `url(#${chromeId})` : design.baseColor;
  const baseOpacity = design.finish === "jelly" ? 0.72 : 1;

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
        <linearGradient id={chromeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={mixHex(design.baseColor, "#ffffff", 0.62)} />
          <stop offset="28%" stopColor={mixHex(design.baseColor, "#ffffff", 0.22)} />
          <stop offset="52%" stopColor={mixHex(design.baseColor, "#fff7ff", 0.74)} />
          <stop offset="72%" stopColor={design.baseColor} />
          <stop offset="100%" stopColor={mixHex(design.baseColor, "#d8f3ff", 0.34)} />
        </linearGradient>
        <linearGradient id="nuvii-gold-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff5b7" />
          <stop offset="22%" stopColor="#c98f20" />
          <stop offset="48%" stopColor="#fff2a3" />
          <stop offset="72%" stopColor="#a96812" />
          <stop offset="100%" stopColor="#f5d36a" />
        </linearGradient>
        <linearGradient id="nuvii-silver-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="24%" stopColor="#aeb8c6" />
          <stop offset="50%" stopColor="#f7fbff" />
          <stop offset="73%" stopColor="#8793a2" />
          <stop offset="100%" stopColor="#dde5ee" />
        </linearGradient>
        <pattern id={glitterId} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.8" fill="#ffffff" opacity="0.88" />
          <circle cx="11" cy="8" r="1.4" fill={mixHex(design.baseColor, "#ffffff", 0.7)} opacity="0.9" />
          <circle cx="5" cy="12" r="1.1" fill="#ffffff" opacity="0.7" />
        </pattern>
      </defs>

      <path
        d={path}
        fill={baseFill}
        fillOpacity={baseOpacity}
        stroke="#c9c4c7"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />

      <g clipPath={`url(#${clipId})`}>
        {design.finish === "glitter" && (
          <path d={path} fill={`url(#${glitterId})`} opacity="0.95" />
        )}

        {design.finish === "chrome" && (
          <>
            <path d={path} fill="#ffffff" opacity="0.08" />
            <path d="M27 28 C40 15 61 18 73 36" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" opacity="0.24" />
            <path d="M31 118 C45 137 62 143 75 132" fill="none" stroke="#d9f6ff" strokeWidth="8" strokeLinecap="round" opacity="0.12" />
          </>
        )}

        {design.finish === "glossy" && (
          <path
            d="M35 19 C24 49 23 108 27 135"
            fill="none"
            stroke="#ffffff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.34"
          />
        )}

        {design.finish === "jelly" && (
          <path
            d="M31 23 C20 60 20 119 29 146"
            fill="none"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.45"
          />
        )}

        {design.layers.map((layer) => {
          const size = getAssetSize(layer.kind);
          const selected = selectedLayerId === layer.id;

          return (
            <g
              key={layer.id}
              transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rotation}) scale(${layer.scale / 100})`}
              opacity={layer.opacity}
              onPointerDown={
                interactive && onLayerPointerDown
                  ? (event: ReactPointerEvent<SVGGElement>) => onLayerPointerDown(event, layer)
                  : undefined
              }
              style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}
            >
              {interactive && (
                <rect
                  x={-size.width / 2}
                  y={-size.height / 2}
                  width={size.width}
                  height={size.height}
                  rx="7"
                  fill="transparent"
                  pointerEvents="all"
                />
              )}
              <AssetGraphic layer={layer} />
            </g>
          );
        })}
      </g>

      {interactive && selectedLayer && (() => {
        const size = getAssetSize(selectedLayer.kind);
        const inverseScale = 100 / Math.max(25, selectedLayer.scale);
        const corners = [
          ["nw", -size.width / 2 - 5, -size.height / 2 - 5],
          ["ne", size.width / 2 + 5, -size.height / 2 - 5],
          ["sw", -size.width / 2 - 5, size.height / 2 + 5],
          ["se", size.width / 2 + 5, size.height / 2 + 5],
        ] as const;
        return (
          <g transform={`translate(${selectedLayer.x} ${selectedLayer.y}) rotate(${selectedLayer.rotation}) scale(${selectedLayer.scale / 100})`}>
            <rect
              x={-size.width / 2 - 5}
              y={-size.height / 2 - 5}
              width={size.width + 10}
              height={size.height + 10}
              rx="8"
              fill="none"
              stroke="#6f7fff"
              strokeWidth={2 * inverseScale}
              strokeDasharray={`${5 * inverseScale} ${4 * inverseScale}`}
              pointerEvents="none"
            />
            {corners.map(([corner, cx, cy]) => (
              <circle
                key={corner}
                cx={cx}
                cy={cy}
                r={6.5 * inverseScale}
                fill="#ffffff"
                stroke="#5f70f5"
                strokeWidth={2 * inverseScale}
                onPointerDown={onLayerResizePointerDown ? (event: ReactPointerEvent<SVGCircleElement>) => onLayerResizePointerDown(event, selectedLayer, corner) : undefined}
                style={{ cursor: `${corner}-resize`, touchAction: "none" }}
                pointerEvents="all"
              />
            ))}
          </g>
        );
      })()}
    </>
  );
}

function NailCard({
  nail,
  design,
  shape,
  length,
  selected,
  selectedLayerId,
  onSelect,
  onSelectLayer,
  onStartLayerMove,
  onMoveLayer,
  onResizeLayer,
}: {
  nail: NailDefinition;
  design: NailDesign;
  shape: NailShape;
  length: NailLength;
  selected: boolean;
  selectedLayerId: string | null;
  onSelect: () => void;
  onSelectLayer: (layerId: string) => void;
  onStartLayerMove: () => void;
  onMoveLayer: (layerId: string, x: number, y: number) => void;
  onResizeLayer: (layerId: string, scale: number) => void;
}) {
  const dragRef = useRef<{
    mode: "move" | "resize";
    layerId: string;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
    originalScale: number;
    startDistance: number;
    centerX: number;
    centerY: number;
    svg: SVGSVGElement;
  } | null>(null);

  const factor = LENGTH_FACTORS[length];
  const widthFactor = SHAPE_WIDTH_FACTORS[shape];
  const width = nail.width * widthFactor;
  const height = nail.height * factor;

  function pointInSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: 50, y: 90 };
  }

  function handleLayerPointerDown(
    event: ReactPointerEvent<SVGGElement>,
    layer: DesignLayer
  ) {
    event.preventDefault();
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    onSelect();
    onSelectLayer(layer.id);
    onStartLayerMove();

    const start = pointInSvg(svg, event.clientX, event.clientY);
    dragRef.current = {
      mode: "move",
      layerId: layer.id,
      startX: start.x,
      startY: start.y,
      originalX: layer.x,
      originalY: layer.y,
      originalScale: layer.scale,
      startDistance: 1,
      centerX: layer.x,
      centerY: layer.y,
      svg,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLayerResizePointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
    layer: DesignLayer,
    _corner: "nw" | "ne" | "sw" | "se"
  ) {
    event.preventDefault();
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    onSelect();
    onSelectLayer(layer.id);
    onStartLayerMove();

    const start = pointInSvg(svg, event.clientX, event.clientY);
    const startDistance = Math.max(1, Math.hypot(start.x - layer.x, start.y - layer.y));
    dragRef.current = {
      mode: "resize",
      layerId: layer.id,
      startX: start.x,
      startY: start.y,
      originalX: layer.x,
      originalY: layer.y,
      originalScale: layer.scale,
      startDistance,
      centerX: layer.x,
      centerY: layer.y,
      svg,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const current = pointInSvg(drag.svg, event.clientX, event.clientY);
    if (drag.mode === "resize") {
      const currentDistance = Math.max(1, Math.hypot(current.x - drag.centerX, current.y - drag.centerY));
      const nextScale = Math.max(20, Math.min(250, drag.originalScale * (currentDistance / drag.startDistance)));
      onResizeLayer(drag.layerId, nextScale);
      return;
    }
    const nextX = Math.max(3, Math.min(97, drag.originalX + current.x - drag.startX));
    const nextY = Math.max(3, Math.min(177, drag.originalY + current.y - drag.startY));
    onMoveLayer(drag.layerId, nextX, nextY);
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <div className={selected ? "nail-card selected-card" : "nail-card"}>
      <div
        className={`nail-click-target ${selected ? "is-selected" : ""}`}
        style={{ width, height }}
        role="button"
        tabIndex={0}
        aria-label={`Select ${nail.hand} ${nail.label}`}
        onClick={onSelect}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") onSelect();
        }}
      >
        <svg
          viewBox="0 0 100 180"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ overflow: "visible", touchAction: "none" }}
        >
          <NailSvgContent
            design={design}
            shape={shape}
            uniqueId={`${nail.id}-editor`}
            selectedLayerId={selected ? selectedLayerId : null}
            interactive
            onLayerPointerDown={handleLayerPointerDown}
            onLayerResizePointerDown={handleLayerResizePointerDown}
          />
          {selected && (
            <path
              d={SHAPE_PATHS[shape]}
              fill="none"
              stroke="#171826"
              strokeWidth="1.05"
              strokeLinejoin="round"
              transform="translate(50 90) scale(1.065 1.045) translate(-50 -90)"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </svg>
      </div>
      <span className={selected ? "nail-label selected" : "nail-label"}>{nail.label}</span>
    </div>
  );
}

function AssetThumbnail({ asset }: { asset: AssetDefinition }) {
  const sampleLayer = makeLayer(asset, { id: `asset-thumbnail-${asset.id}`, x: 0, y: 0, scale: 76 });
  return (
    <svg viewBox="-45 -45 90 90" aria-hidden="true">
      <AssetGraphic layer={sampleLayer} />
    </svg>
  );
}

function ExportBoard({
  projectName,
  nails,
  shape,
  length,
  svgRef,
}: {
  projectName: string;
  nails: NailMap;
  shape: NailShape;
  length: NailLength;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const factor = LENGTH_FACTORS[length];
  const widthFactor = SHAPE_WIDTH_FACTORS[shape];

  const positions = ALL_NAILS.map((nail, index) => ({
    nail,
    x: 210 + index * 145,
    y: 225,
  }));

  return (
    <svg
      ref={svgRef}
      className="export-board"
      xmlns="http://www.w3.org/2000/svg"
      width="1800"
      height="900"
      viewBox="0 0 1800 900"
    >
      <rect width="1800" height="900" fill="#fff8fb" />
      <text x="90" y="90" fontFamily="TAN Mon Cheri, Cormorant Garamond, Georgia, serif" fontSize="46" fontWeight="700" fill="#111827">
        {projectName || "Untitled nail set"}
      </text>
      <text x="90" y="132" fontFamily="Inter, Arial, sans-serif" fontSize="22" fill="#6b7280">
        Nuvii Studio · {titleCase(shape)} · {titleCase(length)}
      </text>
      <text x="560" y="205" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="20" fontWeight="700" letterSpacing="5" fill="#9ca3af">
        LEFT HAND
      </text>
      <text x="1240" y="205" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="20" fontWeight="700" letterSpacing="5" fill="#9ca3af">
        RIGHT HAND
      </text>

      {positions.map(({ nail, x, y }) => {
        const scaleX = (nail.width * widthFactor * 1.5) / 100;
        const scaleY = (nail.height * factor * 1.5) / 180;
        return (
          <g key={nail.id} transform={`translate(${x} ${y}) scale(${scaleX} ${scaleY})`}>
            <NailSvgContent
              design={nails[nail.id]}
              shape={shape}
              uniqueId={`${nail.id}-export`}
            />
          </g>
        );
      })}

      {positions.map(({ nail, x }) => (
        <text
          key={`${nail.id}-label`}
          x={x + 45}
          y="520"
          textAnchor="middle"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="18"
          fill="#6b7280"
        >
          {nail.label}
        </text>
      ))}

      <text x="90" y="825" fontFamily="Inter, Arial, sans-serif" fontSize="18" fill="#b16a87">
        Designed with Nuvii Studio
      </text>
    </svg>
  );
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not encode ${url}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function cloneSvgWithEmbeddedImages(source: SVGSVGElement) {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(
    images.map(async (image) => {
      const href = image.getAttribute("href") ?? image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href || href.startsWith("data:")) return;
      const dataUrl = await imageUrlToDataUrl(href);
      image.setAttribute("href", dataUrl);
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl);
    })
  );
  return clone;
}

function rangeValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

async function resizeImage(file: File, maxDimension = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("Could not load the image."));
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Your browser could not process the image."));
          return;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function analyzeImage(file: File): Promise<{ preview: string; palette: string[] }> {
  const preview = await resizeImage(file, 420);

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onerror = () => reject(new Error("Could not analyze the image."));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("Your browser could not analyze the image."));
        return;
      }
      context.drawImage(image, 0, 0, 64, 64);
      const pixels = context.getImageData(0, 0, 64, 64).data;
      const buckets = new Map<string, number>();

      for (let index = 0; index < pixels.length; index += 16) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const alpha = pixels[index + 3];
        if (alpha < 180) continue;
        if (red > 247 && green > 247 && blue > 247) continue;
        const r = Math.min(255, Math.round(red / 32) * 32);
        const g = Math.min(255, Math.round(green / 32) * 32);
        const b = Math.min(255, Math.round(blue / 32) * 32);
        const key = `${r},${g},${b}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }

      const palette = [...buckets.entries()]
        .sort((first, second) => second[1] - first[1])
        .slice(0, 6)
        .map(([key]) => {
          const [r, g, b] = key.split(",").map(Number);
          return rgbToHex(r, g, b);
        });

      resolve({
        preview,
        palette: palette.length ? palette : ["#f7dce5", "#fffaf7", "#d7ad4d"],
      });
    };
    image.src = preview;
  });
}

function promptHash(prompt: string) {
  return [...prompt].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 17);
}

function buildGeneratedSet({
  prompt,
  referencePalette,
  assets,
}: {
  prompt: string;
  referencePalette: string[];
  assets: AssetDefinition[];
}) {
  const lower = prompt.toLowerCase();
  const foundColors = Object.entries(COLOR_WORDS)
    .filter(([word]) => lower.includes(word))
    .map(([, color]) => color)
    .filter((color, index, array) => array.indexOf(color) === index)
    .slice(0, 5);

  const palette = foundColors.length
    ? foundColors
    : referencePalette.length
      ? referencePalette
      : ["#f7dce5", "#fffaf7", "#d7ad4d"];

  let finish: NailFinish = "glossy";
  if (lower.includes("chrome") || lower.includes("metallic")) finish = "chrome";
  else if (lower.includes("glitter") || lower.includes("sparkly")) finish = "glitter";
  else if (lower.includes("matte")) finish = "matte";
  else if (lower.includes("jelly") || lower.includes("translucent")) finish = "jelly";

  const desiredAssetIds: string[] = [];
  const include = (assetId: string) => {
    if (!desiredAssetIds.includes(assetId)) desiredAssetIds.push(assetId);
  };

  if (lower.includes("french") || lower.includes("tip")) include("french-tip");
  if (/flower|floral|daisy|garden|spring|orchid/.test(lower)) {
    include("daisy");
    include("blossom");
    if (/3d|sculpted|gel/.test(lower)) include("3d-orchid");
  }
  if (/coquette|bow|ribbon|girly/.test(lower)) {
    include("bow");
    include("pearl");
    include("heart");
  }
  if (/celestial|star|moon|space|night|zodiac/.test(lower)) {
    include("star");
    include("moon");
    include("sparkle");
  }
  if (/pearl|bridal|wedding|elegant/.test(lower)) include("pearl");
  if (/heart|romantic|valentine|love/.test(lower)) include("heart");
  if (/swirl|abstract|line|minimal|modern/.test(lower)) {
    include(/3d|raised|sculpted|gel/.test(lower) ? "3d-ribbon-swirl" : "swirl");
    include("abstract-line");
  }
  if (/aura|halo|center glow/.test(lower)) include("aura");
  if (/ombre|gradient|fade/.test(lower)) include("ombre");
  if (/polka|dot/.test(lower)) include("polka-dots");
  if (/cheetah|leopard/.test(lower)) include("cheetah");
  if (/zebra/.test(lower)) include("zebra");
  if (/shell|seashell|ocean|mermaid/.test(lower)) include("3d-shell");
  if (/bubble|raindrop|water drop/.test(lower)) include("3d-bubbles");
  if (/isolated chrome|gold chrome/.test(lower)) include("chrome-swirl-gold");
  if (/silver chrome/.test(lower)) include("chrome-swirl-silver");
  if (/checker|retro|graphic/.test(lower)) include("checker");
  if (/flame|fire|bold|edgy/.test(lower)) include("flame");
  if (/butterfly|y2k/.test(lower)) include("butterfly");
  if (/gem|rhinestone|crystal|bling|glam/.test(lower)) {
    include("gem");
    include("sparkle");
  }

  if (!desiredAssetIds.length) {
    include("sparkle");
    include("swirl");
    include("daisy");
  }

  const availableAssets = desiredAssetIds
    .map((id) => assets.find((asset) => asset.id === id))
    .filter((asset): asset is AssetDefinition => Boolean(asset));

  const minimal = /minimal|simple|clean|subtle/.test(lower);
  const maximal = /maximal|detailed|extra|bold|dramatic/.test(lower);
  const hash = promptHash(`${prompt}-${palette.join("")}`);
  const accentIndexes = new Set([1, 4, 5, 8]);

  return Object.fromEntries(
    ALL_NAILS.map((nail, index) => {
      const baseColor = palette[(index + hash) % palette.length];
      const layers: DesignLayer[] = [];
      const layerCount = minimal ? (accentIndexes.has(index) ? 1 : 0) : maximal ? 2 + (index % 2) : accentIndexes.has(index) ? 2 : 1;

      for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
        const asset = availableAssets[(index + layerIndex + hash) % availableAssets.length];
        if (!asset) continue;
        const isFrench = asset.kind === "french-tip";
        const x = isFrench ? 50 : 35 + ((index * 17 + layerIndex * 29 + hash) % 31);
        const y = isFrench ? 153 : 54 + ((index * 23 + layerIndex * 37 + hash) % 78);
        const accentColor = asset.kind === "swirl" || asset.kind === "abstract-line" || asset.kind === "french-tip"
          ? palette[(index + 1) % palette.length]
          : asset.defaultColor;

        layers.push(
          makeLayer(asset, {
            x,
            y,
            scale: isFrench ? 100 : 62 + ((index * 11 + layerIndex * 17) % 48),
            rotation: isFrench ? 0 : -25 + ((index * 19 + layerIndex * 31) % 51),
            color: accentColor,
          })
        );
      }

      return [
        nail.id,
        {
          baseColor,
          finish,
          layers,
        },
      ];
    })
  ) as NailMap;
}

export default function Home() {
  const [projectName, setProjectName] = useState("My nail set");
  const [shape, setShape] = useState<NailShape>("almond");
  const [length, setLength] = useState<NailLength>("medium");
  const [nails, setNails] = useState<NailMap>(() => createInitialNails());
  const [selectedNail, setSelectedNail] = useState("left-pinky");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("color");
  const [designPanelMode, setDesignPanelMode] = useState<DesignPanelMode>("library");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [clipboard, setClipboard] = useState<NailDesign | null>(null);
  const [customAssets, setCustomAssets] = useState<AssetDefinition[]>([]);
  const [assetGroup, setAssetGroup] = useState<AssetGroup>("2D");
  const [assetCategory, setAssetCategory] = useState<"All" | AssetCategory>("All");
  const [assetSearch, setAssetSearch] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [referencePreview, setReferencePreview] = useState("");
  const [referencePalette, setReferencePalette] = useState<string[]>([]);
  const [generatorMessage, setGeneratorMessage] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Loading…");
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const exportSvgRef = useRef<SVGSVGElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const customAssetInputRef = useRef<HTMLInputElement | null>(null);

  const allAssets = useMemo(
    () => [
      ...STATIC_ASSETS,
      ...customAssets.map((asset) => ({
        ...asset,
        group: asset.group ?? "Uploads",
        category: asset.category ?? "Uploads",
      })),
    ],
    [customAssets]
  );
  const selectedDesign = nails[selectedNail];
  const selectedLayer = selectedDesign.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  const assetCategories = useMemo(() => {
    const categories = allAssets
      .filter((asset) => asset.group === assetGroup)
      .map((asset) => asset.category);
    return ["All", ...Array.from(new Set(categories))] as ("All" | AssetCategory)[];
  }, [allAssets, assetGroup]);

  const visibleAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return allAssets.filter((asset) => {
      const groupMatches = asset.group === assetGroup;
      const categoryMatches = assetCategory === "All" || asset.category === assetCategory;
      const searchMatches =
        !query ||
        asset.name.toLowerCase().includes(query) ||
        asset.tags.some((tag) => tag.includes(query));
      return groupMatches && categoryMatches && searchMatches;
    });
  }, [allAssets, assetCategory, assetGroup, assetSearch]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nuvii-studio-project");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SavedProject>;
        if (parsed.nails && parsed.shape && parsed.length) {
          setNails(parsed.nails);
          setShape(parsed.shape);
          setLength(parsed.length);
          setProjectName(parsed.projectName || "My nail set");
          setCustomAssets(Array.isArray(parsed.customAssets) ? parsed.customAssets : []);
        }
      }
    } catch {
      setToast("The previous local save could not be opened, so a new set was started.");
    } finally {
      setHydrated(true);
      setSaveMessage("Saved locally");
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveMessage("Saving…");
    const timeout = window.setTimeout(() => {
      const project: SavedProject = {
        version: 1,
        projectName,
        nails,
        shape,
        length,
        customAssets,
        savedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem("nuvii-studio-project", JSON.stringify(project));
        setSaveMessage("Saved locally");
      } catch {
        setSaveMessage("Local save is full");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [customAssets, hydrated, length, nails, projectName, shape]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedLayerId) return;
    setActiveInspectorTab("design");
    setDesignPanelMode("edit");
  }, [selectedLayerId]);

  useEffect(() => {
    if (!layersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setLayersOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [layersOpen]);

  function rememberSnapshot() {
    const snapshot: Snapshot = { nails: clone(nails), shape, length };
    setHistory((items) => [...items.slice(-49), snapshot]);
    setFuture([]);
  }

  function replaceNails(nextNails: NailMap, remember = true) {
    if (remember) rememberSnapshot();
    setNails(nextNails);
  }

  function updateSelectedDesign(
    updater: (current: NailDesign) => NailDesign,
    remember = true
  ) {
    if (remember) rememberSnapshot();
    setNails((current) => ({
      ...current,
      [selectedNail]: updater(current[selectedNail]),
    }));
  }

  function updateLayer(layerId: string, patch: Partial<DesignLayer>, remember = false) {
    if (remember) rememberSnapshot();
    setNails((current) => ({
      ...current,
      [selectedNail]: {
        ...current[selectedNail],
        layers: current[selectedNail].layers.map((layer) =>
          layer.id === layerId ? { ...layer, ...patch } : layer
        ),
      },
    }));
  }

  function selectNail(nailId: string) {
    if (nailId === selectedNail) return;
    setSelectedNail(nailId);
    setSelectedLayerId(null);
    setDesignPanelMode("library");
  }

  function selectLayer(layerId: string) {
    setSelectedLayerId(layerId);
    setActiveInspectorTab("design");
    setDesignPanelMode("edit");
  }

  function addAsset(asset: AssetDefinition) {
    const newLayer = makeLayer(asset);
    updateSelectedDesign((current) => ({
      ...current,
      layers: [...current.layers, newLayer],
    }));
    setSelectedLayerId(newLayer.id);
    setActiveInspectorTab("design");
    setDesignPanelMode("edit");
  }

  function applyDesignPreset(assetId: string | null) {
    if (!assetId) {
      clearSelectedNail();
      return;
    }

    const asset = allAssets.find((item) => item.id === assetId);
    if (!asset) return;

    const newLayer = makeLayer(asset);
    rememberSnapshot();
    setNails((current) => ({
      ...current,
      [selectedNail]: {
        ...current[selectedNail],
        layers: [newLayer],
      },
    }));
    setSelectedLayerId(newLayer.id);
    setActiveInspectorTab("design");
    setDesignPanelMode("edit");
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) return;
    updateSelectedDesign((current) => ({
      ...current,
      layers: current.layers.filter((layer) => layer.id !== selectedLayerId),
    }));
    setSelectedLayerId(null);
    setDesignPanelMode("library");
  }

  function duplicateSelectedLayer() {
    if (!selectedLayer) return;
    const duplicate = {
      ...clone(selectedLayer),
      id: makeId("layer"),
      x: Math.min(97, selectedLayer.x + 7),
      y: Math.min(177, selectedLayer.y + 7),
    };
    updateSelectedDesign((current) => ({
      ...current,
      layers: [...current.layers, duplicate],
    }));
    setSelectedLayerId(duplicate.id);
  }

  function moveLayer(direction: "up" | "down") {
    if (!selectedLayerId) return;
    const layers = selectedDesign.layers;
    const index = layers.findIndex((layer) => layer.id === selectedLayerId);
    const nextIndex = direction === "up" ? index + 1 : index - 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) return;
    const updated = [...layers];
    [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
    updateSelectedDesign((current) => ({ ...current, layers: updated }));
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [{ nails: clone(nails), shape, length }, ...items].slice(0, 50));
    setHistory((items) => items.slice(0, -1));
    setNails(clone(previous.nails));
    setShape(previous.shape);
    setLength(previous.length);
    setSelectedLayerId(null);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items.slice(-49), { nails: clone(nails), shape, length }]);
    setFuture((items) => items.slice(1));
    setNails(clone(next.nails));
    setShape(next.shape);
    setLength(next.length);
    setSelectedLayerId(null);
  }

  function copySelectedNail() {
    setClipboard(clone(selectedDesign));
    setToast(`${titleCase(selectedNail)} copied.`);
  }

  function pasteSelectedNail() {
    if (!clipboard) return;
    const pasted = clone(clipboard);
    pasted.layers = pasted.layers.map((layer) => ({ ...layer, id: makeId("layer") }));
    updateSelectedDesign(() => pasted);
    setSelectedLayerId(null);
    setToast(`Design pasted onto ${titleCase(selectedNail)}.`);
  }

  function mirrorHand(source: "left" | "right") {
    const target = source === "left" ? "right" : "left";
    const next = clone(nails);
    FINGERS.forEach((finger) => {
      const sourceId = `${source}-${finger}`;
      const targetId = `${target}-${finger}`;
      next[targetId] = clone(next[sourceId]);
      next[targetId].layers = next[targetId].layers.map((layer) => ({
        ...layer,
        id: makeId("layer"),
        x: 100 - layer.x,
        rotation: -layer.rotation,
      }));
    });
    replaceNails(next);
    setSelectedLayerId(null);
    setToast(`${titleCase(source)} hand mirrored to the ${target} hand.`);
  }

  function applyBaseToAll() {
    const next = Object.fromEntries(
      Object.entries(nails).map(([id, design]) => [
        id,
        {
          ...design,
          baseColor: selectedDesign.baseColor,
          finish: selectedDesign.finish,
        },
      ])
    ) as NailMap;
    replaceNails(next);
  }

  function clearSelectedNail() {
    updateSelectedDesign((current) => ({ ...current, layers: [] }));
    setSelectedLayerId(null);
  }

  function resetProject() {
    if (!window.confirm("Reset all ten nails and remove every design layer?")) return;
    rememberSnapshot();
    setNails(createInitialNails());
    setShape("almond");
    setLength("medium");
    setSelectedNail("left-pinky");
    setSelectedLayerId(null);
  }

  async function uploadCustomAsset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Please choose a PNG, JPG, or WebP image.");
      return;
    }
    try {
      const imageData = await resizeImage(file, 420);
      const asset: AssetDefinition = {
        id: makeId("upload"),
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 30) || "Uploaded design",
        group: "Uploads",
        category: "Uploads",
        kind: "image",
        defaultColor: "#ffffff",
        tags: ["upload", "custom", "image"],
        imageData,
      };
      setCustomAssets((items) => [...items, asset]);
      setAssetGroup("Uploads");
      setAssetCategory("Uploads");
      addAsset(asset);
      setToast("Your image was added to the selected nail and saved in Uploads.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The image could not be uploaded.");
    }
  }

  async function uploadReference(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setGeneratorMessage("Analyzing colours…");
    try {
      const result = await analyzeImage(file);
      setReferencePreview(result.preview);
      setReferencePalette(result.palette);
      setGeneratorMessage("Reference ready. Add a few words or generate directly.");
    } catch (error) {
      setGeneratorMessage(error instanceof Error ? error.message : "The reference could not be analyzed.");
    }
  }

  function generateSet() {
    if (!generatorPrompt.trim() && !referencePalette.length) {
      setGeneratorMessage("Enter a description or upload a reference image first.");
      return;
    }
    const generated = buildGeneratedSet({
      prompt: generatorPrompt.trim() || "reference inspired nail set",
      referencePalette,
      assets: allAssets,
    });
    replaceNails(generated);
    setSelectedLayerId(null);
    setShowGenerator(false);
    setToast("A complete editable set was generated. Every layer can still be changed.");
  }

  async function generateAiArtwork() {
    const prompt = generatorPrompt.trim();
    if (!prompt) {
      setGeneratorMessage("Describe the design you want first.");
      return;
    }

    const endpoint = process.env.NEXT_PUBLIC_NUVII_AI_URL?.replace(/\/$/, "");
    if (!endpoint) {
      setGeneratorMessage("The AI Worker URL is missing. Add NEXT_PUBLIC_NUVII_AI_URL to .env.local and restart the site.");
      return;
    }

    setAiGenerating(true);
    setGeneratorMessage("Generating original nail artwork… This can take 10–30 seconds.");

    try {
      const response = await fetch(`${endpoint}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          shape,
          length,
          baseColor: selectedDesign.baseColor,
        }),
      });

      const payload = await response.json() as { dataURI?: string; error?: string };
      if (!response.ok || !payload.dataURI) {
        throw new Error(payload.error || "The AI service did not return an image.");
      }

      const nailShapedArtwork = await maskGeneratedArtworkToNail(
        payload.dataURI,
        shape
      );

      const asset: AssetDefinition = {
        id: makeId("ai"),
        name: `AI: ${prompt.slice(0, 26)}`,
        group: "Uploads",
        category: "Uploads",
        kind: "ai-texture",
        defaultColor: "#ffffff",
        tags: ["ai", "generated", "texture", ...prompt.toLowerCase().split(/\s+/).slice(0, 8)],
        imageData: nailShapedArtwork,
      };

      const newLayer = makeLayer(asset, { x: 50, y: 90, scale: 100 });
      rememberSnapshot();
      setCustomAssets((items) => [...items, asset]);
      setNails((current) => ({
        ...current,
        [selectedNail]: {
          ...current[selectedNail],
          layers: [...current[selectedNail].layers, newLayer],
        },
      }));
      setSelectedLayerId(newLayer.id);
      setActiveInspectorTab("design");
      setDesignPanelMode("edit");
      setAssetGroup("Uploads");
      setAssetCategory("Uploads");
      setShowGenerator(false);
      setToast("AI artwork was masked into the selected press-on nail. Drag the corners to resize it.");
    } catch (error) {
      setGeneratorMessage(error instanceof Error ? error.message : "The image could not be generated.");
    } finally {
      setAiGenerating(false);
    }
  }

  function addReferenceAsLayer() {
    if (!referencePreview) return;
    const asset: AssetDefinition = {
      id: makeId("reference"),
      name: "Reference image",
      group: "Uploads",
      category: "Uploads",
      kind: "image",
      defaultColor: "#ffffff",
      tags: ["reference", "image"],
      imageData: referencePreview,
    };
    addAsset(asset);
    setShowGenerator(false);
  }

  function downloadProject() {
    const project: SavedProject = {
      version: 1,
      projectName,
      nails,
      shape,
      length,
      customAssets,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(projectName || "nuvii-set").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.nuvii.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<SavedProject>;
      if (!parsed.nails || !parsed.shape || !parsed.length) throw new Error("This is not a valid Nuvii project file.");
      rememberSnapshot();
      setNails(parsed.nails);
      setShape(parsed.shape);
      setLength(parsed.length);
      setProjectName(parsed.projectName || "Imported nail set");
      setCustomAssets(Array.isArray(parsed.customAssets) ? parsed.customAssets : []);
      setSelectedNail("left-pinky");
      setSelectedLayerId(null);
      setToast("Project imported successfully.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The project could not be imported.");
    }
  }

  async function exportPng() {
    const sourceSvg = exportSvgRef.current;
    if (!sourceSvg) return;
    let svg: SVGSVGElement;
    try {
      svg = await cloneSvgWithEmbeddedImages(sourceSvg);
    } catch {
      svg = sourceSvg.cloneNode(true) as SVGSVGElement;
      setToast("The PNG exported, but one or more image assets could not be embedded.");
    }
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        setToast("The PNG could not be created in this browser.");
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          setToast("The PNG could not be created.");
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${(projectName || "nuvii-set").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
        link.click();
        URL.revokeObjectURL(pngUrl);
        setToast("PNG exported.");
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setToast("The export could not be rendered.");
    };
    image.src = url;
  }

  useEffect(() => {
    function handleEditorShortcut(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isTyping) return;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedLayerId) {
        event.preventDefault();
        rememberSnapshot();
        setNails((current) => ({
          ...current,
          [selectedNail]: {
            ...current[selectedNail],
            layers: current[selectedNail].layers.filter((layer) => layer.id !== selectedLayerId),
          },
        }));
        setSelectedLayerId(null);
        setDesignPanelMode("library");
        setToast("Design element deleted.");
      }
    }

    window.addEventListener("keydown", handleEditorShortcut);
    return () => window.removeEventListener("keydown", handleEditorShortcut);
  }, [length, nails, selectedLayerId, selectedNail, shape]);


  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <Image
            src="/nuvii-logo.png"
            alt="Nuvii Press-On Nails"
            width={650}
            height={445}
            priority
            className="topbar-logo"
          />
          <span className="topbar-divider" aria-hidden="true" />
          <label className="project-name-field" htmlFor="project-name">
            <input
              id="project-name"
              value={projectName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setProjectName(event.target.value)}
              maxLength={50}
              aria-label="Project name"
            />
            <span aria-hidden="true">✎</span>
          </label>
        </div>

        <div className="top-actions">
          <div className="history-actions" aria-label="Edit history">
            <button type="button" onClick={undo} disabled={!history.length} title="Undo" aria-label="Undo">↶</button>
            <button type="button" onClick={redo} disabled={!future.length} title="Redo" aria-label="Redo">↷</button>
          </div>
          <span className="save-status" aria-live="polite">{saveMessage}</span>
          <button className="save-button" type="button" onClick={downloadProject}>
            <span aria-hidden="true">↓</span> Save
          </button>
          <button className="export-button" type="button" onClick={exportPng}>
            <span aria-hidden="true">↗</span> Export
          </button>
          <span className="profile-bubble" aria-label="Nuvii profile">N</span>
        </div>
      </header>

      <input
        ref={customAssetInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={uploadCustomAsset}
      />

      <div className="editor-layout">
        <nav className="tool-rail" aria-label="Workspace shortcuts">
          <div className="rail-main-tools">
            <button type="button" className="rail-button active" aria-label="Select and move artwork" title="Select and move">
              <span aria-hidden="true">↖</span>
            </button>
            <button type="button" className="rail-button" onClick={() => setLayersOpen(true)} aria-label="Open layers" title="Layers">
              <span aria-hidden="true">▦</span>
              {!!selectedDesign.layers.length && <i>{selectedDesign.layers.length}</i>}
            </button>
            <button type="button" className="rail-button" onClick={() => customAssetInputRef.current?.click()} aria-label="Upload a design asset" title="Upload asset">
              <span aria-hidden="true">＋</span>
            </button>
            <button type="button" className="rail-button" onClick={() => setShowGenerator(true)} aria-label="Generate a design" title="AI design generator">
              <span aria-hidden="true">✦</span>
            </button>

            <span className="rail-divider" aria-hidden="true" />

            <button type="button" className="rail-button" onClick={copySelectedNail} aria-label="Copy selected nail" title="Copy nail">
              <span aria-hidden="true">⧉</span>
            </button>
            <button type="button" className="rail-button" onClick={pasteSelectedNail} disabled={!clipboard} aria-label="Paste nail design" title="Paste nail">
              <span aria-hidden="true">▣</span>
            </button>
            <button
              type="button"
              className="rail-button"
              onClick={() => mirrorHand(selectedNail.startsWith("left-") ? "left" : "right")}
              aria-label="Mirror the selected hand"
              title="Mirror selected hand"
            >
              <span aria-hidden="true">⇄</span>
            </button>
            <button type="button" className="rail-button rail-danger" onClick={clearSelectedNail} aria-label="Clear selected nail" title="Clear selected nail">
              <span aria-hidden="true">⌫</span>
            </button>
          </div>

          <button type="button" className="rail-button rail-menu" onClick={() => importInputRef.current?.click()} aria-label="Import a project" title="Import project">
            <span aria-hidden="true">⇧</span>
          </button>
        </nav>

        <section className="canvas-stage" aria-label="Nail design canvas">
          <span className="ambient-shape ambient-butterfly" aria-hidden="true">∞</span>
          <span className="ambient-shape ambient-sparkle-one" aria-hidden="true">✦</span>
          <span className="ambient-shape ambient-sparkle-two" aria-hidden="true">✦</span>

          <div className="canvas-card">
            <div className="canvas-card-heading">
              <div>
                <span className="eyebrow">Nail Canvas</span>
                <h1>{titleCase(shape)} nail set</h1>
              </div>
              <span className="selection-count">1 selected</span>
            </div>

            <div className="hand-labels" aria-hidden="true">
              <span>Left hand →</span>
              <span>← Right hand</span>
            </div>

            <div className="ten-nail-row">
              {ALL_NAILS.map((nail) => (
                <NailCard
                  key={nail.id}
                  nail={nail}
                  design={nails[nail.id]}
                  shape={shape}
                  length={length}
                  selected={selectedNail === nail.id}
                  selectedLayerId={selectedLayerId}
                  onSelect={() => selectNail(nail.id)}
                  onSelectLayer={selectLayer}
                  onStartLayerMove={rememberSnapshot}
                  onMoveLayer={(layerId, x, y) => {
                    setSelectedNail(nail.id);
                    setNails((current) => ({
                      ...current,
                      [nail.id]: {
                        ...current[nail.id],
                        layers: current[nail.id].layers.map((layer) =>
                          layer.id === layerId ? { ...layer, x, y } : layer
                        ),
                      },
                    }));
                  }}
                  onResizeLayer={(layerId, scale) => {
                    setSelectedNail(nail.id);
                    setNails((current) => ({
                      ...current,
                      [nail.id]: {
                        ...current[nail.id],
                        layers: current[nail.id].layers.map((layer) =>
                          layer.id === layerId ? { ...layer, scale } : layer
                        ),
                      },
                    }));
                  }}
                />
              ))}
            </div>

            <div className="canvas-card-footer">
              <span>Click a nail to select · drag artwork to move · drag a corner to resize</span>
              <button type="button" onClick={() => setLayersOpen(true)}>
                {selectedDesign.layers.length} layer{selectedDesign.layers.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </section>

        <aside className="inspector-panel" aria-label="Selected nail controls">
          <div className="inspector-heading">
            <div>
              <span className="eyebrow">Currently editing</span>
              <h2>{titleCase(selectedNail)}</h2>
            </div>
            <span>editing 1</span>
          </div>

          <div className="inspector-tabs" role="tablist" aria-label="Editing categories">
            {(["color", "shape", "length", "finish", "design"] as InspectorTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeInspectorTab === tab}
                className={activeInspectorTab === tab ? "active" : ""}
                onClick={() => {
                  setActiveInspectorTab(tab);
                  if (tab === "design" && !selectedLayerId) setDesignPanelMode("library");
                }}
              >
                {titleCase(tab)}
              </button>
            ))}
          </div>

          <div className="inspector-scroll-area">
            {activeInspectorTab === "color" && (
              <div className="inspector-section-stack">
                <section className="inspector-section">
                  <div className="section-title-row">
                    <div>
                      <span className="section-label">Primary color</span>
                      <p>Applied to the selected nail.</p>
                    </div>
                    <input
                      className="compact-color-input"
                      type="color"
                      value={selectedDesign.baseColor}
                      onFocus={rememberSnapshot}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSelectedDesign((current) => ({ ...current, baseColor: event.target.value }), false)
                      }
                      aria-label="Custom base colour"
                    />
                  </div>

                  <div className="expanded-swatch-grid">
                    {BASE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        title={color.name}
                        aria-label={color.name}
                        className={selectedDesign.baseColor.toLowerCase() === color.value.toLowerCase() ? "color-swatch selected" : "color-swatch"}
                        style={{ background: color.value }}
                        onClick={() => updateSelectedDesign((current) => ({ ...current, baseColor: color.value }))}
                      />
                    ))}
                  </div>

                  <label className="hex-color-field">
                    <span className="color-preview" style={{ background: selectedDesign.baseColor }} />
                    <code>{selectedDesign.baseColor.toUpperCase()}</code>
                    <input
                      type="color"
                      value={selectedDesign.baseColor}
                      onFocus={rememberSnapshot}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSelectedDesign((current) => ({ ...current, baseColor: event.target.value }), false)
                      }
                      aria-label="Choose any base colour"
                    />
                  </label>
                </section>

                <section className="inspector-section">
                  <span className="section-label">Accent / tip color</span>
                  {selectedLayer && selectedLayer.kind !== "image" && selectedLayer.kind !== "ai-texture" ? (
                    <label className="accent-color-control">
                      <span className="color-preview" style={{ background: selectedLayer.color }} />
                      <code>{selectedLayer.color.toUpperCase()}</code>
                      <input
                        type="color"
                        value={selectedLayer.color}
                        onFocus={rememberSnapshot}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { color: event.target.value })}
                      />
                    </label>
                  ) : (
                    <button className="soft-callout" type="button" onClick={() => setActiveInspectorTab("design")}>
                      Select or add a design layer to edit its accent colour.
                    </button>
                  )}
                </section>

                <section className="inspector-section">
                  <div className="section-title-row">
                    <span className="section-label">Quick presets</span>
                    <button className="text-button" type="button" onClick={applyBaseToAll}>Apply to all</button>
                  </div>
                  <div className="quick-color-presets">
                    {BASE_COLORS.slice(0, 6).map((color) => (
                      <button
                        key={`preset-${color.value}`}
                        type="button"
                        aria-label={`Use ${color.name}`}
                        style={{ background: `linear-gradient(145deg, ${mixHex(color.value, "#ffffff", 0.6)}, ${color.value})` }}
                        onClick={() => updateSelectedDesign((current) => ({ ...current, baseColor: color.value }))}
                      >♥</button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeInspectorTab === "shape" && (
              <section className="inspector-section shape-options-section">
                <span className="section-label">Nail shape</span>
                <div className="shape-option-list">
                  {(["oval", "square", "almond", "stiletto", "coffin"] as NailShape[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={shape === option ? "shape-option selected" : "shape-option"}
                      onClick={() => {
                        rememberSnapshot();
                        setShape(option);
                      }}
                    >
                      <svg viewBox="0 0 100 180" aria-hidden="true">
                        <path d={SHAPE_PATHS[option]} fill="#c9b5ec" />
                      </svg>
                      <strong>{option === "oval" ? "Round / Oval" : titleCase(option)}</strong>
                      {shape === option && <span aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {activeInspectorTab === "length" && (
              <div className="inspector-section-stack">
                <section className="inspector-section">
                  <span className="section-label">Nail length</span>
                  <div className="length-option-row">
                    {(["short", "medium", "long"] as NailLength[]).map((option, index) => (
                      <button
                        key={option}
                        type="button"
                        className={length === option ? "length-option selected" : "length-option"}
                        onClick={() => {
                          rememberSnapshot();
                          setLength(option);
                        }}
                      >
                        <span className="length-bar" style={{ height: `${42 + index * 20}px` }} />
                        <strong>{option === "medium" ? "Med" : titleCase(option)}</strong>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="inspector-section preview-section">
                  <span className="section-label">Preview</span>
                  <svg viewBox="0 0 100 180" aria-label={`${titleCase(length)} ${titleCase(shape)} nail preview`}>
                    <NailSvgContent
                      design={selectedDesign}
                      shape={shape}
                      uniqueId="length-preview"
                    />
                  </svg>
                </section>
              </div>
            )}

            {activeInspectorTab === "finish" && (
              <section className="inspector-section finish-section">
                <span className="section-label">Surface finish</span>
                <div className="finish-grid">
                  {([
                    ["glossy", "✦", "High-shine lacquer"],
                    ["matte", "■", "Velvet flat finish"],
                    ["jelly", "◇", "Sheer glass tint"],
                    ["glitter", "✷", "Sparkling gel"],
                    ["chrome", "◇", "Soft glazed-pearl sheen"],
                  ] as [NailFinish, string, string][]).map(([option, icon, description]) => (
                    <button
                      key={option}
                      type="button"
                      className={selectedDesign.finish === option ? "finish-option selected" : "finish-option"}
                      onClick={() => updateSelectedDesign((current) => ({ ...current, finish: option }))}
                    >
                      <span aria-hidden="true">{icon}</span>
                      <div>
                        <strong>{titleCase(option)}</strong>
                        <small>{description}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {activeInspectorTab === "design" && (
              <div className="inspector-section-stack design-tab-content">
                {selectedLayer && designPanelMode === "edit" ? (
                  <section className="inspector-section asset-editor-section">
                    <div className="asset-editor-heading">
                      <button type="button" className="back-to-library" onClick={() => setDesignPanelMode("library")}>
                        ← Library
                      </button>
                      <span className="keyboard-hint">Delete / Backspace removes</span>
                    </div>

                    <div className="asset-editor-summary">
                      <span className="asset-editor-preview">
                        <svg viewBox="-50 -50 100 100" aria-hidden="true">
                          <AssetGraphic layer={{ ...selectedLayer, x: 0, y: 0, scale: 78, rotation: 0 }} />
                        </svg>
                      </span>
                      <div>
                        <span className="section-label">Editing asset</span>
                        <h3>{selectedLayer.name}</h3>
                        <p>Drag it to move. Use any corner handle to resize, or use the precise controls below.</p>
                      </div>
                    </div>

                    {((selectedLayer.kind !== "image" && selectedLayer.kind !== "ai-texture") || selectedLayer.tintable) && (
                      <label className="asset-editor-color">
                        <span>Colour</span>
                        <code>{selectedLayer.color.toUpperCase()}</code>
                        <input
                          type="color"
                          value={selectedLayer.color}
                          onFocus={rememberSnapshot}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { color: event.target.value })}
                        />
                      </label>
                    )}

                    <div className="asset-editor-controls">
                      <label className="control-row">
                        <span>Size <b>{Math.round(selectedLayer.scale)}%</b></span>
                        <input type="range" min="25" max="190" value={rangeValue(selectedLayer.scale)} onPointerDown={rememberSnapshot} onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { scale: Number(event.target.value) })} />
                      </label>
                      <label className="control-row">
                        <span>Rotation <b>{Math.round(selectedLayer.rotation)}°</b></span>
                        <input type="range" min="-180" max="180" value={rangeValue(selectedLayer.rotation)} onPointerDown={rememberSnapshot} onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { rotation: Number(event.target.value) })} />
                      </label>
                      <label className="control-row">
                        <span>Horizontal <b>{Math.round(selectedLayer.x)}</b></span>
                        <input type="range" min="0" max="100" value={rangeValue(selectedLayer.x)} onPointerDown={rememberSnapshot} onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { x: Number(event.target.value) })} />
                      </label>
                      <label className="control-row">
                        <span>Vertical <b>{Math.round(selectedLayer.y)}</b></span>
                        <input type="range" min="0" max="180" value={rangeValue(selectedLayer.y)} onPointerDown={rememberSnapshot} onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { y: Number(event.target.value) })} />
                      </label>
                      <label className="control-row">
                        <span>Opacity <b>{Math.round(selectedLayer.opacity * 100)}%</b></span>
                        <input type="range" min="10" max="100" value={rangeValue(selectedLayer.opacity * 100)} onPointerDown={rememberSnapshot} onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) / 100 })} />
                      </label>
                    </div>

                    <div className="asset-editor-actions">
                      <button type="button" onClick={duplicateSelectedLayer}>Duplicate</button>
                      <button type="button" onClick={() => setLayersOpen(true)}>Open layers</button>
                      <button type="button" className="danger" onClick={deleteSelectedLayer}>Delete</button>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="inspector-section">
                      <div className="section-title-row">
                        <div>
                          <span className="section-label">Design style</span>
                          <p>Start with a quick editable layer.</p>
                        </div>
                        <button className="text-button" type="button" onClick={() => setLayersOpen(true)}>
                          Layers ({selectedDesign.layers.length})
                        </button>
                      </div>
                      <div className="design-preset-grid">
                        {[
                          ["Solid", null, "●"],
                          ["French", "french-tip", "◒"],
                          ["Aura", "aura", "◉"],
                          ["Floral", "daisy", "✿"],
                          ["3D Gel", "3d-ribbon-swirl", "〰"],
                          ["Chrome", "chrome-swirl-gold", "◇"],
                        ].map(([label, assetId, icon]) => (
                          <button key={label} type="button" onClick={() => applyDesignPreset(assetId)}>
                            <span aria-hidden="true">{icon}</span>
                            <strong>{label}</strong>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="inspector-section asset-library-section">
                      <div className="asset-library-heading">
                        <div>
                          <span className="section-label">✦ Asset library</span>
                          <p>Click an asset to add it and open editing controls.</p>
                        </div>
                        <button className="upload-button" type="button" onClick={() => customAssetInputRef.current?.click()}>
                          + Upload
                        </button>
                      </div>


                      <label className="asset-search-field">
                        <span aria-hidden="true">⌕</span>
                        <input value={assetSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setAssetSearch(event.target.value)} placeholder="Search assets..." />
                      </label>

                      <div className="asset-group-tabs" role="tablist" aria-label="Asset type">
                        {(["2D", "3D", "Charms", "Chrome", "Uploads"] as AssetGroup[]).map((group) => (
                          <button key={group} type="button" role="tab" aria-selected={assetGroup === group} className={assetGroup === group ? "active" : ""} onClick={() => { setAssetGroup(group); setAssetCategory("All"); }}>
                            {group === "Chrome" ? "Chrome" : group}
                          </button>
                        ))}
                      </div>

                      <div className="asset-category-row">
                        {assetCategories.map((category) => (
                          <button key={category} className={assetCategory === category ? "active" : ""} onClick={() => setAssetCategory(category)} type="button">
                            {category}
                          </button>
                        ))}
                      </div>

                      <div className="asset-library-grid">
                        {visibleAssets.map((asset) => (
                          <button key={asset.id} className="library-asset-card" type="button" onClick={() => addAsset(asset)}>
                            <span className="library-asset-preview"><AssetThumbnail asset={asset} /></span>
                            <strong>{asset.name}</strong>
                            <small>{asset.category}</small>
                          </button>
                        ))}
                        {!visibleAssets.length && <p className="empty-asset-search">No assets match this search.</p>}
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}

            <details id="project-tools" className="project-tools">
              <summary>Project tools</summary>
              <div className="project-tool-grid">
                <button type="button" onClick={copySelectedNail}>Copy nail</button>
                <button type="button" onClick={pasteSelectedNail} disabled={!clipboard}>Paste nail</button>
                <button type="button" onClick={() => mirrorHand("left")}>Mirror left → right</button>
                <button type="button" onClick={() => mirrorHand("right")}>Mirror right → left</button>
                <button type="button" onClick={() => importInputRef.current?.click()}>Import project</button>
                <button type="button" onClick={downloadProject}>Download project</button>
                <button type="button" onClick={clearSelectedNail}>Clear selected nail</button>
                <button className="danger" type="button" onClick={resetProject}>Reset everything</button>
              </div>
              <input ref={importInputRef} type="file" accept=".json,.nuvii.json" hidden onChange={importProject} />
            </details>
          </div>

          <button className="help-button" type="button" onClick={() => setToast("Choose a tab, select a nail, then customize it. Your project saves automatically.")} aria-label="Help">
            ?
          </button>
        </aside>
      </div>

      {layersOpen && (
        <>
          <button
            type="button"
            className="layers-drawer-backdrop"
            onClick={() => setLayersOpen(false)}
            aria-label="Close layers"
          />
          <aside id="layers-drawer" className="layers-drawer panel" role="dialog" aria-modal="true" aria-label="Nail design layers">
          <div className="layers-heading">
            <div>
              <span>Layers</span>
              <strong>{titleCase(selectedNail)}</strong>
            </div>
            <div className="layers-heading-actions">
              <button type="button" onClick={clearSelectedNail} disabled={!selectedDesign.layers.length}>Clear</button>
              <button className="drawer-close" type="button" onClick={() => setLayersOpen(false)} aria-label="Close layers">×</button>
            </div>
          </div>

          <div className="layer-list">
            {[...selectedDesign.layers].reverse().map((layer, reverseIndex) => {
              const actualIndex = selectedDesign.layers.length - 1 - reverseIndex;
              return (
                <button
                  key={layer.id}
                  type="button"
                  className={selectedLayerId === layer.id ? "layer-row selected" : "layer-row"}
                  onClick={() => selectLayer(layer.id)}
                >
                  <span className="layer-thumb">
                    <svg viewBox="-45 -45 90 90"><AssetGraphic layer={{ ...layer, x: 0, y: 0, scale: 72, rotation: 0 }} /></svg>
                  </span>
                  <span className="layer-name">
                    <strong>{layer.name}</strong>
                    <small>Layer {actualIndex + 1}</small>
                  </span>
                  <i style={{ background: layer.color }} />
                </button>
              );
            })}
            {!selectedDesign.layers.length && (
              <div className="empty-layers">
                <span>✦</span>
                <strong>No design layers yet</strong>
                <p>Open Designs and add an element to this nail.</p>
              </div>
            )}
          </div>

          {selectedLayer && (
            <div className="layer-controls">
              <div className="layer-action-row">
                <button type="button" onClick={duplicateSelectedLayer}>Duplicate</button>
                <button type="button" onClick={() => moveLayer("up")}>Move up</button>
                <button type="button" onClick={() => moveLayer("down")}>Move down</button>
                <button className="delete" type="button" onClick={deleteSelectedLayer}>Delete</button>
              </div>

              {((selectedLayer.kind !== "image" && selectedLayer.kind !== "ai-texture") || selectedLayer.tintable) && (
                <label className="control-row color-control">
                  <span>Colour</span>
                  <div>
                    <code>{selectedLayer.color.toUpperCase()}</code>
                    <input
                      type="color"
                      value={selectedLayer.color}
                      onFocus={rememberSnapshot}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { color: event.target.value })}
                    />
                  </div>
                </label>
              )}

              <label className="control-row">
                <span>Horizontal <b>{Math.round(selectedLayer.x)}</b></span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rangeValue(selectedLayer.x)}
                  onPointerDown={rememberSnapshot}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { x: Number(event.target.value) })}
                />
              </label>
              <label className="control-row">
                <span>Vertical <b>{Math.round(selectedLayer.y)}</b></span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={rangeValue(selectedLayer.y)}
                  onPointerDown={rememberSnapshot}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { y: Number(event.target.value) })}
                />
              </label>
              <label className="control-row">
                <span>Size <b>{Math.round(selectedLayer.scale)}%</b></span>
                <input
                  type="range"
                  min="25"
                  max="190"
                  value={rangeValue(selectedLayer.scale)}
                  onPointerDown={rememberSnapshot}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { scale: Number(event.target.value) })}
                />
              </label>
              <label className="control-row">
                <span>Rotation <b>{Math.round(selectedLayer.rotation)}°</b></span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rangeValue(selectedLayer.rotation)}
                  onPointerDown={rememberSnapshot}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { rotation: Number(event.target.value) })}
                />
              </label>
              <label className="control-row">
                <span>Opacity <b>{Math.round(selectedLayer.opacity * 100)}%</b></span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(selectedLayer.opacity * 100)}
                  onPointerDown={rememberSnapshot}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) / 100 })}
                />
              </label>
            </div>
          )}
          </aside>
        </>
      )}


      {showGenerator && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowGenerator(false)}>
          <section className="generator-modal" role="dialog" aria-modal="true" aria-labelledby="generator-title" onMouseDown={(event: ReactMouseEvent<HTMLElement>) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span>Free smart generator</span>
                <h2 id="generator-title">Create nail art with AI</h2>
                <p>Generate original artwork for the selected nail, or use the local set planner to arrange existing assets.</p>
              </div>
              <button type="button" onClick={() => setShowGenerator(false)} aria-label="Close generator">×</button>
            </div>

            <div className="generator-grid">
              <div className="generator-column">
                <label htmlFor="generator-prompt">Describe the set</label>
                <textarea
                  id="generator-prompt"
                  value={generatorPrompt}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setGeneratorPrompt(event.target.value)}
                  placeholder="Milky nude nail art with a silver chrome bow, tiny starbursts and a soft glitter fade…"
                  rows={7}
                />
                <div className="prompt-chips">
                  {[
                    "Pink coquette bows and pearls",
                    "Dark cherry celestial chrome",
                    "Minimal white floral french tips",
                    "Pastel butterfly Y2K glitter",
                  ].map((prompt) => (
                    <button key={prompt} type="button" onClick={() => setGeneratorPrompt(prompt)}>{prompt}</button>
                  ))}
                </div>
              </div>

              <div className="generator-column">
                <span className="field-label">Reference picture</span>
                <label className="reference-dropzone">
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadReference} />
                  {referencePreview ? (
                    <img src={referencePreview} alt="Uploaded nail inspiration reference" />
                  ) : (
                    <>
                      <strong>Upload inspiration</strong>
                      <small>PNG, JPG, or WebP</small>
                    </>
                  )}
                </label>
                {!!referencePalette.length && (
                  <div className="reference-palette">
                    {referencePalette.map((color) => <i key={color} style={{ background: color }} title={color} />)}
                  </div>
                )}
                {referencePreview && (
                  <button className="secondary-button full" type="button" onClick={addReferenceAsLayer}>
                    Add picture as a layer instead
                  </button>
                )}
              </div>
            </div>

            {generatorMessage && <p className="generator-message">{generatorMessage}</p>}

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setShowGenerator(false)} disabled={aiGenerating}>Cancel</button>
              <button className="secondary-button" type="button" onClick={generateSet} disabled={aiGenerating}>Plan set with library</button>
              <button className="primary-button" type="button" onClick={generateAiArtwork} disabled={aiGenerating}>
                {aiGenerating ? "Generating…" : "Generate AI art for selected nail"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      <ExportBoard
        projectName={projectName}
        nails={nails}
        shape={shape}
        length={length}
        svgRef={exportSvgRef}
      />
    </main>
  );
}
