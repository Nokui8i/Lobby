import type { ReactNode } from "react";
import { SupportWorkspace } from "./SupportWorkspace";

export default function SupportSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <SupportWorkspace>{children}</SupportWorkspace>
    </div>
  );
}
