import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { MissionsView } from "./MissionsView";

export const metadata: Metadata = { title: "미션과 리워드" };

export default function MissionsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <MissionsView />
    </Suspense>
  );
}
