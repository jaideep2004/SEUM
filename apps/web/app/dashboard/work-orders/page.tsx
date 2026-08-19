"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkOrdersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/maintenance/workshops");
  }, [router]);

  return null;
}