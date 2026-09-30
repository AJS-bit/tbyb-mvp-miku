import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "데모 일정 요청" };

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Request a demo · Step 01" title="데모 일정 요청">
        날짜와 픽업 매장만 고르면 돼요. 나머지는 편하게 골라 주세요.
      </PageHeader>
      <RequestForm />
    </div>
  );
}
