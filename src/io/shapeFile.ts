import {
  loadShapeDefinition,
  parseSavedShapeDefinition,
  saveShapeDefinition,
  serializeSavedShapeDefinition,
  type SavedShapeDefinitionV1,
} from "../domain/shapeSerialization";
import type { ShapeDefinition } from "../domain/shapeDefinition";

function suggestedFileName(definition: ShapeDefinition): string {
  const base = definition.name.trim() || definition.id || "shape";
  const safe = base.replace(/[^\w.-]+/g, "_");
  return `${safe}.shape.json`;
}

export function downloadShapeDefinitionFile(definition: ShapeDefinition): void {
  const saved = saveShapeDefinition(definition);
  const text = serializeSavedShapeDefinition(saved);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = suggestedFileName(definition);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

export async function readShapeDefinitionFile(
  file: File,
): Promise<ShapeDefinition> {
  const text = await file.text();
  const saved: SavedShapeDefinitionV1 = parseSavedShapeDefinition(text);
  return loadShapeDefinition(saved);
}
