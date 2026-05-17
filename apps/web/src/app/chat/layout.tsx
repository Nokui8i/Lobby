import type { ReactNode } from "react";
import { HomeHeader } from "../components/HomeHeader";
import { ChatWorkspace } from "./ChatWorkspace";
import chatLayoutStyles from "./chatLayout.module.css";

export default function ChatSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className={chatLayoutStyles.page}>
      <HomeHeader variant="flat" />
      <div className={chatLayoutStyles.body}>
        <ChatWorkspace>{children}</ChatWorkspace>
      </div>
    </div>
  );
}
