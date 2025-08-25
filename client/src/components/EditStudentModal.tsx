import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const editStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(40, "First name must be 40 characters or less"),
  lastName: z.string().min(1, "Last name is required").max(40, "Last name must be 40 characters or less"),
  notes: z.string().max(400, "Notes must be 400 characters or less").optional().or(z.literal(""))
});

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  notes?: string;
  createdAt: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function EditStudentModal({ isOpen, onClose, student }: EditStudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof editStudentSchema>>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      notes: ""
    }
  });

  // Update form when student changes
  useEffect(() => {
    if (student) {
      form.reset({
        firstName: student.firstName,
        lastName: student.lastName,
        notes: student.notes || ""
      });
    }
  }, [student, form]);

  const editStudentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editStudentSchema>) => {
      if (!student) throw new Error("No student selected");
      const cleanData = {
        firstName: data.firstName,
        lastName: data.lastName,
        notes: data.notes || undefined
      };
      return await apiRequest("PUT", `/api/students/${student.id}`, cleanData);
    },
    onSuccess: () => {
      toast({
        title: "Student Updated",
        description: "Your student has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Student",
        description: error.message || "An error occurred while updating the student.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof editStudentSchema>) => {
    editStudentMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Student</DialogTitle>
          <DialogDescription className="text-white/60">
            Update your student's information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">First Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        placeholder="Enter first name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Last Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                        placeholder="Enter last name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 resize-none"
                      placeholder="Any important notes about your student (allergies, special needs, etc.)"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editStudentMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {editStudentMutation.isPending ? "Updating..." : "Update Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}