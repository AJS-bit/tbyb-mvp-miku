"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { myHref, useIdParam } from "@/components/reservation";
import { Notice } from "@/components/ui";

export function RecordRedirect() {
  const id = useIdParam();
  const router = useRouter();
  const target = id ? myHref(id, "missions/") : "/my/";
  useEffect(() => {
    router.replace(target);
  }, [router, target]);
  return (
    <Notice title="비교 기록은 미션으로 바뀌었어요">
      이동 중이에요…{" "}
      <Link href={target} className="font-bold underline underline-offset-2">
        바로 열기
      </Link>
    </Notice>
  );
}
