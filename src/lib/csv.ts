/**
 * Tiny client-side CSV exporter.
 *
 * Zero deps — RFC 4180 quoting only (double quotes around any cell that
 * contains a comma, quote, or newline; embedded quotes doubled).
 *
 * Usage:
 *   downloadCsv("talent-pool.csv", [
 *     ["Name", "Score", "Years"],
 *     ["Alok", 82, 6],
 *     ["Riya", 71, 4],
 *   ]);
 */

type Cell = string | number | boolean | null | undefined;

export function toCsv(rows: Cell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

function escapeCell(c: Cell): string {
  if (c === null || c === undefined) return "";
  const s = typeof c === "string" ? c : String(c);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv(filename: string, rows: Cell[][]): void {
  const csv = toCsv(rows);
  // BOM helps Excel pick UTF-8 on open.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
