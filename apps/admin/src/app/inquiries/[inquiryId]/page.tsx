import { AdminSupportThreadClient } from "../AdminSupportThreadClient";

interface AdminInquiryThreadPageProps {
  params: Promise<{ inquiryId: string }>;
}

export default async function AdminInquiryThreadPage({ params }: AdminInquiryThreadPageProps) {
  const { inquiryId } = await params;
  return <AdminSupportThreadClient inquiryId={inquiryId} />;
}
