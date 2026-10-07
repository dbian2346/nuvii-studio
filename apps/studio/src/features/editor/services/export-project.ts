import { ASSET_BY_ID } from "../domain/asset-data";
import { NAIL_DEFINITIONS, SHAPE_PATHS } from "../domain/editor-data";
import type {
  AssetDefinition,
  AssetPaint,
  AssetVectorElement,
  EditorProject,
  Nail,
  NailLayer,
} from "../domain/types";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "nuvii-set";
}

function finishOverlay(nail: Nail, index: number): string {
  const clipId = `clip-${index}`;
  const path = SHAPE_PATHS[nail.shape];

  if (nail.finish === "matte") return "";
  if (nail.finish === "glitter") {
    return `<g clip-path="url(#${clipId})" fill="#ffffff" opacity="0.78">
      <circle cx="32" cy="36" r="2.2"/><circle cx="61" cy="53" r="1.7"/>
      <circle cx="43" cy="88" r="2"/><circle cx="69" cy="116" r="2.5"/>
      <circle cx="36" cy="142" r="1.8"/><circle cx="57" cy="158" r="1.5"/>
    </g>`;
  }
  if (nail.finish === "chrome") {
    return `<path d="${path}" fill="url(#chrome-${index})" opacity="0.72"/>`;
  }
  if (nail.finish === "jelly") {
    return `<path d="${path}" fill="#ffffff" opacity="0.22"/>`;
  }
  return `<path d="M31 28 C27 66 29 116 39 147" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.48"/>`;
}

function assetPaint(
  paint: AssetPaint | undefined,
  layer: NailLayer,
  asset: AssetDefinition,
): string | undefined {
  if (!paint) return undefined;
  if (paint === "none") return "none";
  if (paint === "white") return "#ffffff";
  if (paint === "secondary") return asset.secondaryColor;
  return layer.color;
}

function vectorElementMarkup(
  element: AssetVectorElement,
  layer: NailLayer,
  asset: AssetDefinition,
): string {
  const fill = assetPaint(element.fill, layer, asset);
  const stroke = assetPaint(element.stroke, layer, asset);
  const style = [
    fill ? `fill="${fill}"` : "",
    stroke ? `stroke="${stroke}"` : "",
    element.strokeWidth ? `stroke-width="${element.strokeWidth}"` : "",
    typeof element.opacity === "number" ? `opacity="${element.opacity}"` : "",
    `stroke-linecap="round" stroke-linejoin="round"`,
  ].filter(Boolean).join(" ");

  switch (element.type) {
    case "path":
      return `<path d="${element.d}" ${style}/>`;
    case "circle":
      return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" ${style}/>`;
    case "ellipse":
      return `<ellipse cx="${element.cx}" cy="${element.cy}" rx="${element.rx}" ry="${element.ry}" ${style}/>`;
    case "line":
      return `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" ${style}/>`;
  }
}

function layerMarkup(layer: NailLayer, clipId: string): string {
  if (layer.imageData?.startsWith("data:image/")) {
    return `<image clip-path="url(#${clipId})" href="${escapeXml(layer.imageData)}"
      x="0" y="0" width="100" height="180" preserveAspectRatio="xMidYMid slice"
      opacity="${layer.opacity}"
      transform="translate(${layer.x} ${layer.y}) rotate(${layer.rotation}) scale(${layer.width / 100} ${layer.height / 180}) translate(-50 -90)"/>`;
  }
  const asset = ASSET_BY_ID.get(layer.assetId);
  if (!asset) return "";
  const elements = asset.elements
    .map((element) => vectorElementMarkup(element, layer, asset))
    .join("");
  return `<g clip-path="url(#${clipId})" opacity="${layer.opacity}"
    transform="translate(${layer.x} ${layer.y}) rotate(${layer.rotation}) scale(${layer.width / 100} ${layer.height / 100}) translate(-50 -50)">
    ${elements}
  </g>`;
}

function nailLengthScale(nail: Nail): number {
  return nail.length === "short" ? 0.74 : nail.length === "medium" ? 0.87 : 1;
}

function nailMarkup(nail: Nail, index: number, x: number, y: number): string {
  const lengthScale = nailLengthScale(nail);
  const path = SHAPE_PATHS[nail.shape];
  return `<g transform="translate(${x} ${y}) scale(1.04 ${1.34 * lengthScale})">
    <defs>
      <clipPath id="clip-${index}"><path d="${path}"/></clipPath>
      <linearGradient id="chrome-${index}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset="0.32" stop-color="${nail.baseColor}"/>
        <stop offset="0.58" stop-color="#77727a"/><stop offset="0.82" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${nail.baseColor}"/>
      </linearGradient>
    </defs>
    <path d="${path}" fill="${nail.baseColor}" stroke="#d8c9c3" stroke-width="0.8"/>
    ${finishOverlay(nail, index)}
    ${nail.layers.map((layer) => layerMarkup(layer, `clip-${index}`)).join("")}
  </g>`;
}

export function createProjectSvg(project: EditorProject): string {
  const nails = NAIL_DEFINITIONS.map(({ id }) => project.nails[id]);
  const rows = [nails.slice(0, 5), nails.slice(5, 10)];
  const content = rows
    .flatMap((row, rowIndex) =>
      row.map((nail, columnIndex) => {
        const index = rowIndex * 5 + columnIndex;
        return nailMarkup(nail, index, 355 + columnIndex * 220, 220 + rowIndex * 350);
      }),
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1050" viewBox="0 0 1800 1050">
    <rect width="1800" height="1050" fill="#fafafc"/>
    <text x="100" y="100" font-family="Georgia, serif" font-size="44" fill="#000000">NUVII STUDIO</text>
    <text x="100" y="152" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#75737a">${escapeXml(project.name)}</text>
    <text x="225" y="355" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#75737a">R</text>
    <text x="225" y="705" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#75737a">L</text>
    ${content}
    <text x="100" y="980" font-family="Arial, sans-serif" font-size="20" fill="#9573e4">Designed with Nuvii Studio</text>
  </svg>`;
}

export function createNailSvg(nail: Nail): string {
  const exportScale = 3 / nailLengthScale(nail);
  const offsetX = 260 - 52 * exportScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="760" viewBox="0 0 520 760">
    <g transform="translate(${offsetX} 20) scale(${exportScale})">
      ${nailMarkup(nail, 0, 0, 0)}
    </g>
  </svg>`;
}

async function downloadSvgPng(
  svg: string,
  width: number,
  height: number,
  filename: string,
): Promise<void> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new window.Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("The export could not be rendered."));
      candidate.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot create the PNG export.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("The PNG export failed.")),
        "image/png",
      );
    });
    const pngUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    try {
      link.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    } finally {
      link.remove();
      URL.revokeObjectURL(pngUrl);
    }
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function downloadProjectPng(project: EditorProject): Promise<void> {
  await downloadSvgPng(
    createProjectSvg(project),
    1800,
    1050,
    `${slugify(project.name)}.png`,
  );
}

export async function downloadNailPng(nail: Nail, projectName: string): Promise<void> {
  await downloadSvgPng(
    createNailSvg(nail),
    520,
    760,
    `${slugify(projectName)}-${nail.hand}-${slugify(nail.label)}.png`,
  );
}
