"use client";

import { parseSupportChatRouteId } from "@lobby/shared";
import { ChatThreadClient } from "./ChatThreadClient";
import { SupportThreadClient } from "../support/SupportThreadClient";

export function MessagesThreadClient({ routeId }: { routeId: string }) {
  const supportInquiryId = parseSupportChatRouteId(routeId);
  if (supportInquiryId) {
    return <SupportThreadClient inquiryId={supportInquiryId} />;
  }
  return <ChatThreadClient threadId={routeId} />;
}
