/**
 * Single SVG node in the Talent Analysis Graph.
 *
 * Renders a circle + multi-line label. Colors + size come from the parent
 * graph component, which already classified the node's status.
 */
import { useMemo } from "react";

export interface SkillNodeData {
  x: number;
  y: number;
  radius: number;
  label: string;
  score?: number;
  fill: string;
  stroke: string;
  text: string;
  isCenter: boolean;
}

interface SkillNodeProps {
  data: SkillNodeData;
}

/** Break a label into <=2 lines of <=14 chars each for the SVG <text>. */
function wrapLabel(label: string): string[] {
  if (label.length <= 14) return [label];
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= 14) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
    if (lines.length === 1 && current.length >= 14) {
      lines.push(current);
      current = "";
      break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

export function SkillNode({ data }: SkillNodeProps) {
  const lines = useMemo(() => wrapLabel(data.label), [data.label]);
  const fontSize = data.isCenter ? 13 : 11;
  const labelDy = -((lines.length - 1) * fontSize) / 2;

  return (
    <g>
      <circle
        cx={data.x}
        cy={data.y}
        r={data.radius}
        fill={data.fill}
        stroke={data.stroke}
        strokeWidth={2}
      />
      {/* Skill label (multi-line) */}
      {lines.map((line, i) => (
        <text
          key={i}
          x={data.x}
          y={data.y + labelDy + i * fontSize}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fontWeight={data.isCenter ? 700 : 600}
          fill={data.text}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {line}
        </text>
      ))}
      {/* Score chip on non-center nodes */}
      {!data.isCenter && data.score != null && (
        <text
          x={data.x}
          y={data.y + data.radius + 12}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={data.stroke}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {data.score}/100
        </text>
      )}
    </g>
  );
}
