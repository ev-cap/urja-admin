"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface SortableSidebarItemProps {
  id: string
  isActive: boolean
  isDraggingEnabled: boolean
  children: React.ReactNode
}

export function SortableSidebarItem({
  id,
  isActive,
  isDraggingEnabled,
  children,
}: SortableSidebarItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isDraggingEnabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <SidebarMenuItem 
      ref={setNodeRef} 
      style={style}
      className={cn(
        isDraggingEnabled && "group/sortable-item",
        isDragging && "cursor-grabbing"
      )}
    >
      <div className="relative flex items-center w-full">
        {isDraggingEnabled && (
          <button
            {...attributes}
            {...listeners}
            type="button"
            className={cn(
              "flex items-center justify-center w-6 h-6 mr-1 flex-shrink-0",
              "opacity-0 group-hover/sortable-item:opacity-100 transition-opacity",
              "cursor-grab active:cursor-grabbing",
              "hover:bg-sidebar-accent/50 rounded",
              "z-20"
            )}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-sidebar-foreground/60" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </SidebarMenuItem>
  )
}
