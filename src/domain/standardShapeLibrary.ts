import type { ComposedShapeDefinition } from "./shapeDefinition";

/**
 * Canonical standard shapes expressed as composed layouts.
 * These are the replacements for the old built-in families.
 */

const STANDARD_SHAPES: ComposedShapeDefinition[] = [
  {
    kind: "composed",
    id: "square",
    name: "Square",
    layout: {
      width: 1,
      height: 1,
      rows: ["S"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "half-square",
    name: "Half-square",
    layout: {
      width: 1,
      height: 1,
      rows: ["l"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "windmill",
    name: "Windmill",
    layout: {
      width: 2,
      height: 2,
      rows: ["S.", ".S"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "cambridge-hexagon",
    name: "Cambridge Hexagon",
    layout: {
      width: 2,
      height: 2,
      rows: ["Sl", "RS"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "hollow-diamond",
    name: "Hollow Diamond",
    layout: {
      width: 4,
      height: 4,
      rows: [".rl.", "rLRl", "RlrL", ".RL."],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "chevron",
    name: "Chevron",
    layout: {
      width: 3,
      height: 2,
      rows: ["rl.", "LR."],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "diamond",
    name: "Diamond",
    layout: {
      width: 3,
      height: 2,
      rows: ["rl.", "RL."],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "oblong",
    name: "Oblong",
    layout: {
      width: 3,
      height: 3,
      rows: ["rl.", "RSl", ".RL"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "pentagon",
    name: "Pentagon",
    layout: {
      width: 3,
      height: 2,
      rows: ["rl.", "RS."],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "pyramid",
    name: "Pyramid",
    layout: {
      width: 2,
      height: 1,
      rows: ["rl"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "rhomboid",
    name: "Rhomboid",
    layout: {
      width: 2,
      height: 1,
      rows: ["Rl"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "pygmy-hourglass",
    name: "Pygmy Hourglass",
    layout: {
      width: 2,
      height: 2,
      rows: [".L", "r."],
      overlapRows: 3,
      overlapCols: 2,
    },
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    kind: "composed",
    id: "triple-pygmy-hourglass",
    name: "Triple Pygmy Hourglass",
    layout: {
      width: 2,
      height: 2,
      rows: [".L", "r."],
      overlapRows: 5,
      overlapCols: 3,
    },
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    kind: "composed",
    id: "truncated-pyramid",
    name: "Truncated Pyramid",
    layout: {
      width: 2,
      height: 1,
      rows: ["rl"],
      overlapRows: 0,
      overlapCols: 0,
    },
  },
  {
    kind: "composed",
    id: "left-star",
    name: "Left Star",
    layout: {
      width: 4,
      height: 4,
      rows: ["..r.", ".SSL", "rSS.", ".L.."],
      overlapRows: 1,
      overlapCols: 1,
    },
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    kind: "composed",
    id: "right-star",
    name: "Right Star",
    layout: {
      width: 4,
      height: 4,
      rows: [".l..", "RSS.", ".SSl", "..R."],
      overlapRows: 1,
      overlapCols: 1,
    },
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    kind: "composed",
    id: "enneagon",
    name: "Enneagon",
    layout: {
      width: 3,
      height: 3,
      rows: ["rl.", "RSS", ".S."],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
  {
    kind: "composed",
    id: "whirligig",
    name: "Whirligig",
    layout: {
      width: 2,
      height: 2,
      rows: ["lL", "rR"],
      overlapRows: 1,
      overlapCols: 1,
    },
  },
];

/**
 * Default shape used for new puzzles.
 */
export const DEFAULT_STANDARD_SHAPE_ID = "square";

export function getAllStandardShapes(): ComposedShapeDefinition[] {
  return [...STANDARD_SHAPES].sort((a, b) => a.name.localeCompare(b.name));
}

export function getStandardShapeById(
  id: string,
): ComposedShapeDefinition | undefined {
  return STANDARD_SHAPES.find((shape) => shape.id === id);
}
