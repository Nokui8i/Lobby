import type { ReactNode } from "react";
import { ChatWorkspace } from "./ChatWorkspace";

export default function ChatSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ChatWorkspace>{children}</ChatWorkspace>
    </div>
  );
}
