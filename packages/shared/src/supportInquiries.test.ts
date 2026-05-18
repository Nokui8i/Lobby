import { describe, expect, it } from "vitest";
import {
  formatSupportInquiryReference,
  normalizeSupportInquiryStatus,
  supportInquiryIsOpen,
  supportInquiryNeedsTreatment,
  validateSupportInquiryMessage,
  validateSupportInquirySubject,
} from "./supportInquiries";

describe("supportInquiries", () => {
  it("normalizes legacy statuses", () => {
    expect(normalizeSupportInquiryStatus("in_progress")).toBe("open");
    expect(normalizeSupportInquiryStatus("resolved")).toBe("closed");
    expect(normalizeSupportInquiryStatus("open")).toBe("open");
    expect(normalizeSupportInquiryStatus("closed")).toBe("closed");
  });

  it("detects open inquiries", () => {
    expect(supportInquiryIsOpen("open")).toBe(true);
    expect(supportInquiryIsOpen("closed")).toBe(false);
    expect(supportInquiryNeedsTreatment("open")).toBe(true);
  });

  it("formats reference number", () => {
    expect(formatSupportInquiryReference(100042)).toBe("100042");
    expect(formatSupportInquiryReference(0)).toBe("—");
  });

  it("validates subject and message lengths", () => {
    expect(validateSupportInquirySubject("ab")).toBe(true);
    expect(validateSupportInquirySubject("a")).toBe(false);
    expect(validateSupportInquiryMessage("שלום")).toBe(true);
    expect(validateSupportInquiryMessage("")).toBe(false);
  });
});
