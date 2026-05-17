import type { ReactNode } from "react";
import { HomeHeader } from "../components/HomeHeader";
import publishLayoutStyles from "./publishLayout.module.css";

export default function PublishLayout({ children }: { children: ReactNode }) {
  return (
    <div className={publishLayoutStyles.page}>
      <HomeHeader variant="flat" />
      <div className={publishLayoutStyles.body}>{children}</div>
    </div>
  );
}
