import type { Metadata } from "next";
import { OpsView } from "./OpsView";

export const metadata: Metadata = { title: "운영 시뮬레이터 (데모)" };

export default function OpsPage() {
  return <OpsView />;
}
