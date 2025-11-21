"use client";

import DynamicScrollIslandTOC, { TOC_INTERFACE } from "@/components/ui/dynamic-scroll-island-toc";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS: TOC_INTERFACE[] = [
  { name: "Dashboard", value: "/dashboard" },
  { name: "Users", value: "/dashboard/users" },
  { name: "Orders", value: "/dashboard/orders" },
  { name: "Analytics", value: "/dashboard/analytics" },
  { name: "Reports", value: "/dashboard/reports" },
  { name: "Settings", value: "/dashboard/settings" },
];

export function DashboardNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const currentItem = NAV_ITEMS.find((item) => item.value === pathname) || NAV_ITEMS[0];

  const handleNavChange = (item: TOC_INTERFACE) => {
    if (item.value) {
      router.push(item.value);
    }
  };

  return (
    <DynamicScrollIslandTOC
      data={NAV_ITEMS}
      value={currentItem}
      setValue={handleNavChange}
      lPrefix="dashboard"
    />
  );
}

