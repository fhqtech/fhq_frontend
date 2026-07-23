import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface MarkdownNotesProps {
  value: string;
  onChange: (value: string) => void;
  maxWords?: number;
  placeholder?: string;
  label?: string;
}

function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Markdown notes editor — a Write/Preview textarea with a live word count.
 * The candidate's assumptions & approach answer, rendered with GFM (headings,
 * lists, tables) on Preview. No raw-HTML passthrough (react-markdown escapes
 * HTML by default), so it's safe for candidate-authored content.
 */
export function MarkdownNotes({
  value,
  onChange,
  maxWords,
  placeholder = "Explain your assumptions and approach…",
  label = "Assumptions & approach",
}: MarkdownNotesProps) {
  const words = countWords(value);
  const over = maxWords != null && words > maxWords;

  return (
    <Tabs defaultValue="write" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <span className={cn("font-mono text-xs tabular-nums", over ? "text-danger" : "text-muted")}>
          {words}
          {maxWords != null ? ` / ${maxWords}` : ""} words
        </span>
      </div>

      <TabsContent value="write">
        <textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-40 w-full rounded-md border border-rule bg-paper p-3 text-sm text-ink placeholder:text-muted focus:border-gold-ink focus:outline-none"
        />
      </TabsContent>

      <TabsContent value="preview">
        <div className="prose prose-sm min-h-40 max-w-none rounded-md border border-rule bg-paper p-3 text-sm text-ink">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted">Nothing to preview yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
