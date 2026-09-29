import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { DecideView } from "./DecideView";

export const metadata: Metadata = { title: "마지막 날 결정" };

export default function DecidePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DecideView />
    </Suspense>
  );
}
