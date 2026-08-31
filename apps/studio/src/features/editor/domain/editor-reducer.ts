import { createInitialProject } from "./editor-data";
import type {
  EditorAction,
  EditorProject,
  EditorState,
  Nail,
  NailId,
  NailLayer,
} from "./types";

const HISTORY_LIMIT = 50;

export function createInitialEditorState(): EditorState {
  return {
    project: createInitialProject(),
    selectedNailId: "right-index",
    selectedLayerId: null,
    activeTool: "properties",
    activeSection: "fill",
    recentAssetIds: [],
    past: [],
    future: [],
  };
}

function commitNailLayers(
  state: EditorState,
  nailId: NailId,
  layers: NailLayer[],
): EditorState {
  const nail = state.project.nails[nailId];
  return commitProject(state, {
    ...state.project,
    nails: {
      ...state.project.nails,
      [nailId]: { ...nail, layers },
    },
  });
}

function commitProject(state: EditorState, project: EditorProject): EditorState {
  if (project === state.project) return state;

  return {
    ...state,
    project,
    past: [...state.past, state.project].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        project: action.project,
        selectedNailId: action.project.nails[state.selectedNailId]
          ? state.selectedNailId
          : "right-index",
        selectedLayerId: null,
        recentAssetIds: action.recentAssetIds ?? state.recentAssetIds,
        past: [],
        future: [],
      };

    case "select-nail":
      return state.selectedNailId === action.nailId
        ? state
        : { ...state, selectedNailId: action.nailId, selectedLayerId: null };

    case "select-tool":
      return state.activeTool === action.tool
        ? state
        : { ...state, activeTool: action.tool };

    case "select-layer":
      return {
        ...state,
        selectedNailId: action.nailId,
        selectedLayerId: action.layerId,
        activeTool: "layers",
      };

    case "select-section":
      return state.activeSection === action.section
        ? state
        : { ...state, activeSection: action.section };

    case "update-selected-nail": {
      const currentNail = state.project.nails[state.selectedNailId];
      const nextNail: Nail = { ...currentNail, ...action.patch };
      const unchanged = Object.entries(action.patch).every(
        ([property, value]) => currentNail[property as keyof Nail] === value,
      );
      if (unchanged) return state;

      return commitProject(state, {
        ...state.project,
        nails: {
          ...state.project.nails,
          [state.selectedNailId]: nextNail,
        },
      });
    }

    case "apply-selected-to-all": {
      const selected = state.project.nails[state.selectedNailId];
      const value = selected[action.property];
      const alreadyApplied = Object.values(state.project.nails).every(
        (nail) => nail[action.property] === value,
      );
      if (alreadyApplied) return state;

      const nails = Object.fromEntries(
        Object.entries(state.project.nails).map(([id, nail]) => [
          id,
          { ...nail, [action.property]: value },
        ]),
      ) as EditorProject["nails"];

      return commitProject(state, { ...state.project, nails });
    }

    case "add-layer": {
      const nail = state.project.nails[state.selectedNailId];
      const committed = commitNailLayers(state, state.selectedNailId, [
        ...nail.layers,
        action.layer,
      ]);
      return {
        ...committed,
        activeTool: "layers",
        selectedLayerId: action.layer.id,
        recentAssetIds: [
          action.layer.assetId,
          ...state.recentAssetIds.filter((id) => id !== action.layer.assetId),
        ].slice(0, 8),
      };
    }

    case "update-layer": {
      const nail = state.project.nails[action.nailId];
      const layer = nail.layers.find((candidate) => candidate.id === action.layerId);
      if (!layer) return state;
      const unchanged = Object.entries(action.patch).every(
        ([property, value]) => layer[property as keyof NailLayer] === value,
      );
      if (unchanged) return state;
      return commitNailLayers(
        state,
        action.nailId,
        nail.layers.map((candidate) =>
          candidate.id === action.layerId ? { ...candidate, ...action.patch } : candidate,
        ),
      );
    }

    case "duplicate-layer": {
      const nail = state.project.nails[action.nailId];
      const layer = nail.layers.find((candidate) => candidate.id === action.layerId);
      if (!layer) return state;
      const duplicate: NailLayer = {
        ...layer,
        id: action.newLayerId,
        name: `${layer.name} copy`,
        x: Math.min(92, layer.x + 5),
        y: Math.min(170, layer.y + 7),
      };
      const committed = commitNailLayers(state, action.nailId, [
        ...nail.layers,
        duplicate,
      ]);
      return { ...committed, selectedLayerId: duplicate.id };
    }

    case "delete-layer": {
      const nail = state.project.nails[action.nailId];
      const index = nail.layers.findIndex((layer) => layer.id === action.layerId);
      if (index < 0) return state;
      const layers = nail.layers.filter((layer) => layer.id !== action.layerId);
      const nextSelection = layers[Math.min(index, layers.length - 1)]?.id ?? null;
      const committed = commitNailLayers(state, action.nailId, layers);
      return { ...committed, selectedLayerId: nextSelection };
    }

    case "move-layer": {
      const nail = state.project.nails[action.nailId];
      const index = nail.layers.findIndex((layer) => layer.id === action.layerId);
      const targetIndex = action.direction === "forward" ? index + 1 : index - 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= nail.layers.length) return state;
      const layers = [...nail.layers];
      [layers[index], layers[targetIndex]] = [layers[targetIndex], layers[index]];
      return commitNailLayers(state, action.nailId, layers);
    }

    case "apply-ai-result": {
      const committed = commitProject(state, action.project);
      return { ...committed, selectedLayerId: null };
    }

    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
}
