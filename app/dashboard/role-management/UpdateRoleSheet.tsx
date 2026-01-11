"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Sheet from "@/components/ui/native-swipeable-sheets";
import type { WheelPickerOption } from "@/components/wheel-picker";
import { WheelPicker, WheelPickerWrapper } from "@/components/wheel-picker";
import { updateUserRole } from "@/lib/services/userService";
import type { User } from "@/types/auth";

const formSchema = z.object({
  userRole: z.enum(["user", "admin", "superadmin"]),
});

type FormSchema = z.infer<typeof formSchema>;

const roleOptions: WheelPickerOption[] = [
  {
    label: "User",
    value: "user",
  },
  {
    label: "Admin",
    value: "admin",
  },
  {
    label: "Super Admin",
    value: "superadmin",
  },
];

interface UpdateRoleSheetProps {
  open: boolean;
  close: () => void;
  user: User | null;
  onSuccess?: () => void;
}

export function UpdateRoleSheet({
  open,
  close,
  user,
  onSuccess,
}: UpdateRoleSheetProps) {
  const currentRole = (user?.userRole || user?.role || "user").toLowerCase();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userRole: currentRole as "user" | "admin" | "superadmin",
    },
  });

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      const role = (user.userRole || user.role || "user").toLowerCase() as "user" | "admin" | "superadmin";
      form.reset({ userRole: role });
    }
  }, [user, form]);

  const onSubmit: SubmitHandler<FormSchema> = async (values) => {
    if (!user?.id) {
      toast.error("User ID is required");
      return;
    }

    // Check if the selected role is the same as the current role
    const currentRole = (user.userRole || user.role || "user").toLowerCase();
    if (values.userRole.toLowerCase() === currentRole) {
      toast.error(`This user already has the ${values.userRole} role`);
      return;
    }

    try {
      await updateUserRole(user.id, values.userRole);
      toast.success(`Role updated to ${values.userRole}`);
      close();
      onSuccess?.();
    } catch (error: any) {
      console.error("[UpdateRoleSheet] Error updating role:", error);
      toast.error(error.message || "Failed to update role");
    }
  };

  const userName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.name || user?.email || user?.phone || user?.id || "User";

  return (
    <Sheet open={open} close={close} title="Update User Role">
      <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-xl font-bold text-foreground">Update User Role</h3>
            <p className="text-sm text-muted-foreground">
              Change the role for {userName}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="userRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>

                  <FormControl>
                    <div className="flex justify-center py-4">
                      <WheelPickerWrapper>
                        <WheelPicker
                          options={roleOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </WheelPickerWrapper>
                    </div>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Role
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Sheet>
  );
}
