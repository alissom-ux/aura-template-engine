export type PreviewMode = "placeholders" | "example";

export interface PreviewHighlightTarget {
  kind: "variable" | "text" | "issue";
  value: string;
}
