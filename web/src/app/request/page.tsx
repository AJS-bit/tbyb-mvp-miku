import type { Metadata } from "next";
import { PACK_NAME } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "데모 일정 요청" };

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={PACK_NAME} title="데모 일정 요청">
        희망 시작일과 작업 유형을 알려 주세요. 요청은 확정이 아니며, 운영자가 Air와 Pro 두 기기를 확인한 뒤 안내합니다.
      </PageHeader>
      <RequestForm />
    </div>
  );
}
