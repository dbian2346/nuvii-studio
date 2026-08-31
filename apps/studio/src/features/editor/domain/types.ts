export type Hand = "left" | "right";
export type Finger = "pinky" | "ring" | "middle" | "index" | "thumb";
export type NailId = `${Hand}-${Finger}`;

export type NailShape = "almond" | "oval" | "square" | "coffin" | "stiletto";
export type NailLength = "short" | "medium" | "long";
export type NailFinish = "glossy" | "matte" | "chrome" | "glitter" | "jelly";

export type InspectorSection = "fill" | "finish" | "shape";
export type EditorTool = "properties" | "assets" | "layers" | "ai";
export type EditableNailProperty = "baseColor" | "shape" | "length" | "finish";

export type AssetCategory = "design" | "3d" | "charms" | "chrome";
export type NailLayerKind = AssetCategory | "generated" | "unknown";
export type AssetSubcategory =
  | "bows"
  | "french-tips"
  | "aura"
  | "ombre"
  | "florals"
  | "swirls"
  | "stars"
  | "hearts"
  | "animal-prints"
  | "patterns"
  | "gel-swirls"
  | "flowers"
  | "bubbles"
  | "shells"
  | "pearls"
  | "rhinestones"
  | "gems"
  | "chains"
  | "caviar-beads"
  | "gold"
  | "silver"
  | "isolated-elements";

export type AssetPaint = "primary" | "secondary" | "white" | "none";

interface AssetVectorStyle {
  fill?: AssetPaint;
  opacity?: number;
  stroke?: AssetPaint;
  strokeWidth?: number;
}

export type AssetVectorElement =
  | (AssetVectorStyle & { type: "path"; d: string })
  | (AssetVectorStyle & { type: "circle"; cx: number; cy: number; r: number })
  | (AssetVectorStyle & {
      type: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
    })
  | (AssetVectorStyle & {
      type: "line";
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    });

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  subcategory: AssetSubcategory;
  tags: readonly string[];
  defaultColor: string;
  secondaryColor: string;
  defaultWidth: number;
  defaultHeight: number;
  tintable: boolean;
  metallic?: "gold" | "silver";
  elements: readonly AssetVectorElement[];
}

export interface NailLayer {
  id: string;
  assetId: string;
  name: string;
  kind: NailLayerKind;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  imageData?: string;
  tintable?: boolean;
  metallic?: "gold" | "silver";
}

export interface Nail {
  id: NailId;
  hand: Hand;
  finger: Finger;
  label: string;
  baseColor: string;
  shape: NailShape;
  length: NailLength;
  finish: NailFinish;
  layers: NailLayer[];
}

export interface EditorProject {
  schemaVersion: 3;
  name: string;
  collectionName: string;
  nails: Record<NailId, Nail>;
}

export interface EditorState {
  project: EditorProject;
  selectedNailId: NailId;
  selectedLayerId: string | null;
  activeTool: EditorTool;
  activeSection: InspectorSection;
  recentAssetIds: string[];
  past: EditorProject[];
  future: EditorProject[];
}

export type NailAppearancePatch = Partial<
  Pick<Nail, "baseColor" | "shape" | "length" | "finish">
>;

export type NailLayerPatch = Partial<
  Pick<NailLayer, "x" | "y" | "width" | "height" | "rotation" | "opacity" | "color">
>;

export type EditorAction =
  | { type: "hydrate"; project: EditorProject; recentAssetIds?: string[] }
  | { type: "select-nail"; nailId: NailId }
  | { type: "select-tool"; tool: EditorTool }
  | { type: "select-layer"; nailId: NailId; layerId: string }
  | { type: "select-section"; section: InspectorSection }
  | { type: "update-selected-nail"; patch: NailAppearancePatch }
  | { type: "apply-selected-to-all"; property: EditableNailProperty }
  | { type: "add-layer"; layer: NailLayer }
  | { type: "update-layer"; nailId: NailId; layerId: string; patch: NailLayerPatch }
  | { type: "duplicate-layer"; nailId: NailId; layerId: string; newLayerId: string }
  | { type: "delete-layer"; nailId: NailId; layerId: string }
  | {
      type: "move-layer";
      nailId: NailId;
      layerId: string;
      direction: "forward" | "backward";
    }
  | { type: "apply-ai-result"; project: EditorProject }
  | { type: "undo" }
  | { type: "redo" };
