import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { RecordRedirect } from "./RecordRedirect";

// v1 '비교 기록' 주소 — v2 에서는 미션으로 바뀌었다. 예전 링크를 연 사람을 미션 화면으로 보낸다.
export const metadata: Metadata = { title: "미션으로 옮겼어요", robots: { index: false } };

export default function RecordPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <RecordRedirect />
    </Suspense>
  );
}
