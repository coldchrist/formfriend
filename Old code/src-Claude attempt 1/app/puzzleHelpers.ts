import { isTopologyReflectableAcrossLeadingDiagonal } from "../domain/squareTopology";
import type { AppMode, FormStyle, SolveMode, Topology } from "../domain/types";

export function getAllowedSizes(): number[] {
  return [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
}

export function resolveFormStyleForTopology(
  requestedFormStyle: FormStyle,
  topology: Topology,
): FormStyle {
  if (requestedFormStyle === "single") {
    return isTopologyReflectableAcrossLeadingDiagonal(topology)
      ? "single"
      : "double";
  }

  return "double";
}

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getSolveModeForStoreMode(mode: AppMode): SolveMode {
  return mode === "solve_strict" ? "strict" : "checkable";
}
