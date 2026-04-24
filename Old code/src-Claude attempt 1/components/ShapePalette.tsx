import type { ShapePrimitive } from "../domain/shapeDefinition";

type ShapePaletteProps = {
  selectedPrimitive: ShapePrimitive;
  onSelectPrimitive: (primitive: ShapePrimitive) => void;
};

const PALETTE_ITEMS: Array<{
  primitive: ShapePrimitive | "CLEAR";
  label: string;
  title: string;
}> = [
  { primitive: "S", label: "■", title: "Square (S)" },
  { primitive: "L", label: "◤", title: "Left halfsquare (L)" },
  { primitive: "R", label: "◥", title: "Right halfsquare (R)" },
  { primitive: "l", label: "◣", title: "Inverted left halfsquare (l)" },
  { primitive: "r", label: "◢", title: "Inverted right halfsquare (r)" },
  { primitive: ".", label: "·", title: "Erase / blank (Space)" },
  { primitive: "CLEAR", label: "⌫", title: "Clear grid" },
];

export function ShapePalette({
  selectedPrimitive,
  onSelectPrimitive,
}: ShapePaletteProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "0.5rem",
        marginTop: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      {PALETTE_ITEMS.map((item) => {
        const isSelected =
          item.primitive !== "CLEAR" && item.primitive === selectedPrimitive;

        return (
          <button
            key={item.primitive}
            type="button"
            title={item.title}
            onClick={() => {
              if (item.primitive === "CLEAR") {
                const event = new CustomEvent("clear-designer-grid");
                window.dispatchEvent(event);
              } else {
                onSelectPrimitive(item.primitive);
              }
            }}
            style={{
              padding: "0.6rem 0.5rem",
              borderRadius: "0.5rem",
              border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
              background: isSelected ? "#dbeafe" : "white",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1.2,
            }}
          >
            <div>{item.label}</div>
            <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {item.primitive === "." ? "Space" : item.primitive}
            </div>
          </button>
        );
      })}
    </div>
  );
}
