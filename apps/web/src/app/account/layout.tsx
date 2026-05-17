import type { ReactNode } from "react";
import { HomeHeader } from "../components/HomeHeader";
import chatLayoutStyles from "../chat/chatLayout.module.css";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={chatLayoutStyles.page}>
      <HomeHeader variant="flat" />
      <div className={chatLayoutStyles.body}>{children}</div>
    </div>
  );
}
