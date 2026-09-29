import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { MyView } from "./MyView";

export const metadata: Metadata = { title: "내 체험" };

export default function MyPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <MyView />
    </Suspense>
  );
}
