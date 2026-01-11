"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
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
  Shield,
  Route,
  type LucideIcon,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
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
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import {
  isCustomOrderEnabled,
  getSidebarOrder,
  saveSidebarOrder,
  applyCustomOrder,
} from "@/lib/utils/sidebarPreferences"
import { SortableSidebarItem } from "@/components/sortable-sidebar-item"

type MenuItem = {
  title: string
  url: string
  icon: LucideIcon
}

const defaultMenuItems: MenuItem[] = [
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
    title: "Plan Route Analytics",
    url: "/dashboard/plan-route-analytics",
    icon: Route,
  },
  {
    title: "Role Management",
    url: "/dashboard/role-management",
    icon: Shield,
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
  const { signOut, userId } = useAuth()
  const router = useRouter()
  const isCollapsed = state === "collapsed"
  
  const [customOrderEnabled, setCustomOrderEnabled] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems)

  // Load preferences function
  const loadPreferences = useCallback(() => {
    if (!userId) return

    const enabled = isCustomOrderEnabled(userId)
    setCustomOrderEnabled(enabled)

    if (enabled) {
      const customOrder = getSidebarOrder(userId)
      // Only use custom order if it exists and has items
      if (customOrder && customOrder.length > 0) {
        const ordered = applyCustomOrder(defaultMenuItems, customOrder)
        setMenuItems(ordered)
      } else {
        // Start with default order when enabling for the first time or after clearing
        setMenuItems(defaultMenuItems)
      }
    } else {
      setMenuItems(defaultMenuItems)
    }
  }, [userId])

  // Initialize preferences
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Listen for preference changes
  useEffect(() => {
    if (!userId) return

    const handlePreferenceChange = (event: CustomEvent<{ userId: string }>) => {
      if (event.detail.userId === userId) {
        loadPreferences()
      }
    }

    window.addEventListener('sidebarPreferencesChanged', handlePreferenceChange as EventListener)
    return () => {
      window.removeEventListener('sidebarPreferencesChanged', handlePreferenceChange as EventListener)
    }
  }, [userId, loadPreferences])

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (!userId || !customOrderEnabled) return

    const { active, over } = event

    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((item) => item.title === active.id)
        const newIndex = items.findIndex((item) => item.title === over.id)

        if (oldIndex === -1 || newIndex === -1) return items

        const newItems = [...items]
        const [removed] = newItems.splice(oldIndex, 1)
        if (removed) {
          // Adjust newIndex if moving down (oldIndex < newIndex)
          // because removing an item shifts all subsequent items down by 1
          const adjustedNewIndex = oldIndex < newIndex ? newIndex - 1 : newIndex
          newItems.splice(adjustedNewIndex, 0, removed)

          // Save new order
          const order = newItems.map((item) => item.title)
          saveSidebarOrder(userId, order)

          return newItems
        }
        return items
      })
    }
  }


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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleExpand}
                  className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarGroupAction onClick={handleCollapse}>
                    <ChevronLeft className="size-4" />
                  </SidebarGroupAction>
                </TooltipTrigger>
                <TooltipContent side="left" align="center">
                  Collapse sidebar
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <SidebarGroupContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={menuItems.map((item) => item.title)}
                strategy={verticalListSortingStrategy}
              >
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = pathname === item.url
                    return (
                      <SortableSidebarItem
                        key={item.title}
                        id={item.title}
                        isActive={isActive}
                        isDraggingEnabled={customOrderEnabled && !isCollapsed}
                      >
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SortableSidebarItem>
                    )
                  })}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!isCollapsed && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
