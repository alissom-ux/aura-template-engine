import type { ReactNode } from "react";

interface CopilotMessageProps {
  author: "assistant" | "user" | "system";
  title: string;
  children: ReactNode;
}

export function CopilotMessage({ author, title, children }: CopilotMessageProps) {
  return (
    <article className={`copilot-message ${author}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </article>
  );
}
