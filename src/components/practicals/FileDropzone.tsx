import { useRef, useState, type DragEvent } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** Accepted extensions, e.g. [".pdf", ".xlsx"]. Empty = accept anything. */
  accept?: string[];
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Multi-file dropzone with removable chips. Replaces the single hidden-input
 * upload the three candidate submit pages copy-pasted. Drag-drop + click,
 * client-side type/size validation, de-dupes by name+size.
 */
export function FileDropzone({
  files,
  onChange,
  accept = [],
  maxFiles = 10,
  maxSizeMb = 25,
  disabled = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acceptSet = accept.map((a) => a.toLowerCase());

  function addFiles(incoming: File[]) {
    setError(null);
    const valid: File[] = [];
    for (const f of incoming) {
      if (acceptSet.length && !acceptSet.includes(extOf(f.name))) {
        setError(`${f.name} isn't an accepted type (${accept.join(", ")}).`);
        continue;
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`${f.name} is over ${maxSizeMb} MB.`);
        continue;
      }
      valid.push(f);
    }
    if (!valid.length) return;
    const merged = [...files];
    for (const f of valid) {
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
    }
    onChange(merged.slice(0, maxFiles));
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          dragging ? "border-gold-ink bg-gold-soft" : "border-rule hover:border-gold-ink",
        )}
      >
        <Upload className="h-5 w-5 text-gold-ink" />
        <p className="text-sm text-ink">Drop files here or click to upload</p>
        {accept.length > 0 && (
          <p className="text-xs text-muted">
            {accept.join(", ")} · up to {maxSizeMb} MB each
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}`}
              className="flex items-center gap-2 rounded-sm border border-rule bg-paper px-3 py-1.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-gold-ink" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted">{formatSize(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-muted transition-colors hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
