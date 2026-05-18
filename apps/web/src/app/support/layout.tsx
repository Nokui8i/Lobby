import type { ReactNode } from "react";
import { HomeHeader } from "../components/HomeHeader";
import { SupportWorkspace } from "./SupportWorkspace";
import chatLayoutStyles from "../chat/chatLayout.module.css";

export default function SupportSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className={chatLayoutStyles.page}>
      <HomeHeader variant="flat" />
      <div className={chatLayoutStyles.body}>
        <SupportWorkspace>{children}</SupportWorkspace>
      </div>
    </div>
  );
}
