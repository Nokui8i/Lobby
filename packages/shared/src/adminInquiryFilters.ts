import type { SupportInquiryListFilters, SupportInquiryRecord } from "./supportInquiries";
import { supportInquiryNeedsTreatment } from "./supportInquiries";

export function filterAdminSupportInquiries(
  inquiries: SupportInquiryRecord[],
  filters: SupportInquiryListFilters,
): SupportInquiryRecord[] {
  const search = filters.search.trim().toLowerCase();
  return inquiries.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }
    if (filters.category !== "all" && item.category !== filters.category) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = [
      item.subject,
      item.lastMessagePreview,
      item.displayName,
      item.assignedToDisplayName,
      item.userEmail,
      item.displayName,
      String(item.referenceNumber),
      item.id,
      item.listingId,
      item.listingTitle,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function countOpenSupportInquiries(inquiries: SupportInquiryRecord[]): number {
  return inquiries.filter((item) => supportInquiryNeedsTreatment(item.status)).length;
}
