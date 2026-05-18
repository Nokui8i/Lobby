import type { ReactNode } from "react";
import { InquiriesWorkspace } from "./InquiriesWorkspace";

export default function InquiriesLayout({ children }: { children: ReactNode }) {
  return <InquiriesWorkspace>{children}</InquiriesWorkspace>;
}
