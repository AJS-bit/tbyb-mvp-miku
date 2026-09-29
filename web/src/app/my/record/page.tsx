import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { RecordView } from "./RecordView";

export const metadata: Metadata = { title: "비교 기록" };

export default function RecordPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <RecordView />
    </Suspense>
  );
}
