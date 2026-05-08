import type { MessageSectionType } from "./message-structure.model.js";

export const CopyBlockKind = {
  Header: "HEADER",
  BodyOpening: "BODY_OPENING",
  BodyContext: "BODY_CONTEXT",
  BodyMain: "BODY_MAIN",
  BodyCta: "BODY_CTA",
  Footer: "FOOTER",
  Button: "BUTTON",
} as const;

export type CopyBlockKind = (typeof CopyBlockKind)[keyof typeof CopyBlockKind];

export const CopyBlockVariantRole = {
  Primary: "PRIMARY",
  Alternative: "ALTERNATIVE",
  Control: "CONTROL",
} as const;

export type CopyBlockVariantRole =
  (typeof CopyBlockVariantRole)[keyof typeof CopyBlockVariantRole];

export interface CopyBlock {
  id: string;
  kind: CopyBlockKind;
  sectionType: MessageSectionType;
  variantRole: CopyBlockVariantRole;
  text: string;
  variables: string[];
  rationale: string;
  warnings: string[];
}

export interface CopyBlockSet {
  id: string;
  blocks: CopyBlock[];
  warnings: string[];
}
