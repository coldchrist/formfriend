import type {
  CanonicalShapeDefinition,
  ShapeDefinition,
} from "./shapeDefinition";
import { normalizeShapeDefinition } from "./shapeSerialization";

/**
 * Canonical standard shapes expressed as composed layouts.
 * These are the replacements for the old built-in families.
 */

const STANDARD_SHAPES: CanonicalShapeDefinition[] = [
  {
    version: 1,
    kind: "composed",
    id: "square",
    name: "Square",
    layout: "S",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "half-square",
    name: "Half-square",
    layout: "l",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "windmill",
    name: "Windmill",
    layout: "S.:.S",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "cambridge-hexagon",
    name: "Cambridge Hexagon",
    layout: "Sl:RS",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "hollow-diamond",
    name: "Hollow Diamond",
    layout: ".rl.:rLRl:RlrL:.RL.",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "chevron",
    name: "Chevron",
    layout: "rl.:LR.",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "diamond",
    name: "Diamond",
    layout: "rl.:RL.",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "oblong",
    name: "Oblong",
    layout: "rl.:RSl:.RL",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "pentagon",
    name: "Pentagon",
    layout: "rl.:RS.",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "pyramid",
    name: "Pyramid",
    layout: "rl",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "pyramidal-windmill",
    name: "Pyramidal windmill",
    extraEntryReadingPolicy: "rightward-then-downward",
    layout: "rl..:..RL",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "square",
    },
    extraEntries: [
      {
        kind: "parametricLine",
        id: "X1",
        label: "X1",
        segment: {
          kind: "parametricLine",
          start: {
            row: 0,
            col: {
              kind: "sizeAffine",
              sizeMultiplier: 1,
              offset: -1,
            },
          },
          direction: "southeast",
          length: {
            kind: "sizeAffine",
            sizeMultiplier: 2,
            offset: -1,
          },
        },
      },
    ],
  },
  {
    version: 1,
    kind: "composed",
    id: "left-fan",
    name: "Left fan",
    layout: "rr:r.",
    overlapRows: 0,
    overlapCols: 0,
    renderHints: {
      gridPresentation: "hex",
    },
    extraEntries: [
      {
        kind: "parametricLine",
        id: "X1",
        label: "X1",
        segment: {
          kind: "parametricLine",
          start: {
            row: 0,
            col: {
              kind: "sizeAffine",
              sizeMultiplier: 2,
              offset: -1,
            },
          },
          direction: "southwest",
          length: {
            kind: "sizeAffine",
            sizeMultiplier: 2,
            offset: 0,
          },
        },
      },
    ],
    extraEntryReadingPolicy: "downward-then-rightward",
  },
  {
    version: 1,
    kind: "composed",
    id: "right-whirligig",
    name: "Right whirligig",
    layout: "Rr:Ll",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "square",
    },
    extraEntries: [],
    extraEntryReadingPolicy: "downward-then-rightward",
  },
  {
    version: 1,
    kind: "composed",
    id: "left-whirligig",
    name: "Left whirligig",
    layout: "lL:rR",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "square",
    },
    extraEntries: [],
    extraEntryReadingPolicy: "downward-then-rightward",
  },
  {
    version: 1,
    kind: "composed",
    id: "right-fan",
    name: "Right fan",
    layout: "ll:.l",
    overlapRows: 0,
    overlapCols: 0,
    renderHints: {
      gridPresentation: "hex",
    },
    extraEntries: [
      {
        kind: "parametricLine",
        id: "X1",
        label: "X1",
        segment: {
          kind: "parametricLine",
          start: {
            row: 0,
            col: 0,
          },
          direction: "southeast",
          length: {
            kind: "sizeAffine",
            sizeMultiplier: 2,
            offset: 0,
          },
        },
      },
    ],
    extraEntryReadingPolicy: "downward-then-rightward",
  },
  {
    version: 1,
    kind: "composed",
    id: "octagon",
    name: "Octagon",
    layout: "rSl:SSS:RSL",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "hex",
    },
    extraEntries: [],
    extraEntryReadingPolicy: "downward-then-rightward",
  },
  {
    version: 1,
    kind: "composed",
    id: "rhomboid",
    name: "Rhomboid",
    layout: "Rl",
    overlapRows: 1,
    overlapCols: 1,
  },
  {
    version: 1,
    kind: "composed",
    id: "pygmy-hourglass",
    name: "Pygmy Hourglass",
    layout: ".L:r.",
    overlapRows: 3,
    overlapCols: 2,
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    version: 1,
    kind: "composed",
    id: "triple-pygmy-hourglass",
    name: "Triple Pygmy Hourglass",
    layout: ".L:r.",
    overlapRows: 5,
    overlapCols: 3,
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    version: 1,
    kind: "composed",
    id: "truncated-pyramid",
    name: "Truncated Pyramid",
    layout: "rl",
    overlapRows: 0,
    overlapCols: 0,
  },
  {
    version: 1,
    kind: "composed",
    id: "left-star",
    name: "Left Star",
    layout: "..r.:.SSL:rSS.:.L..",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    version: 1,
    kind: "composed",
    id: "right-star",
    name: "Right Star",
    layout: ".l..:RSS.:.SSl:..R.",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "hex",
    },
  },
  {
    version: 1,
    kind: "composed",
    id: "hexagon",
    name: "Hexagon",
    layout: "rSl:RSL",
    overlapRows: 1,
    overlapCols: 1,
    renderHints: {
      gridPresentation: "square",
    },
    extraEntries: [],
    extraEntryReadingPolicy: "downward-then-rightward",
  },
  {
    version: 1,
    kind: "composed",
    id: "enneagon",
    name: "Enneagon",
    layout: "rl.:RSS:.S.",
    overlapRows: 1,
    overlapCols: 1,
  },
];

/**
 * Default shape used for new puzzles.
 */
export const DEFAULT_STANDARD_SHAPE_ID = "square";

export function getAllStandardShapeDefinitions(): CanonicalShapeDefinition[] {
  return [...STANDARD_SHAPES].sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllStandardShapes(): ShapeDefinition[] {
  return getAllStandardShapeDefinitions().map((shape) =>
    normalizeShapeDefinition(shape),
  );
}

export function getStandardShapeDefinitionById(
  id: string,
): CanonicalShapeDefinition | undefined {
  return STANDARD_SHAPES.find((shape) => shape.id === id);
}

export function getStandardShapeById(id: string): ShapeDefinition | undefined {
  const shape = getStandardShapeDefinitionById(id);
  return shape ? normalizeShapeDefinition(shape) : undefined;
}
