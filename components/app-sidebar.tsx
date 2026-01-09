"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Code,
  Users,
  CreditCard,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "API Explorer",
    url: "/dashboard/api-explorer",
    icon: Code,
  },
  {
    title: "User Management",
    url: "/dashboard/user-management",
    icon: Users,
  },
  {
    title: "Credit Consumption",
    url: "/dashboard/credit-consumption",
    icon: CreditCard,
  },
  {
    title: "Customer Support",
    url: "/dashboard/customer-support",
    icon: MessageSquare,
  },
  {
    title: "Search Analytics",
    url: "/dashboard/search-analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()
  const { signOut } = useAuth()
  const router = useRouter()
  const isCollapsed = state === "collapsed"

  const handleCollapse = () => {
    setOpen(false)
  }

  const handleExpand = () => {
    setOpen(true)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/signin')
    } catch (error) {
      console.error('[AppSidebar] Error signing out:', error)
    }
  }

  return (
    <Sidebar collapsible="icon">
      {isCollapsed && (
        <SidebarHeader className="justify-center">
          <div className="flex items-center justify-center w-full">
            <button
              onClick={handleExpand}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupAction onClick={handleCollapse} title="Collapse sidebar">
                <ChevronLeft className="size-4" />
              </SidebarGroupAction>
            </>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!isCollapsed && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-1 w-full px-2">
                <div className="shrink-0">
                  <ThemeToggle />
                </div>
                <div className="flex-1 min-w-0 -ml-1">
                  <UserMenu />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
