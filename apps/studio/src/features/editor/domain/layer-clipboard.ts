import type { NailLayer } from "./types";

export function createPastedLayer(layer: NailLayer, id: string): NailLayer {
  return {
    ...layer,
    id,
    name: `${layer.name} copy`,
    x: Math.min(92, layer.x + 5),
    y: Math.min(170, layer.y + 7),
  };
}
