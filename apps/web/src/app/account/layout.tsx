import type { ReactNode } from "react";
import { PageMain } from "@/components/layout/PageMain";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <PageMain flush>{children}</PageMain>;
}
