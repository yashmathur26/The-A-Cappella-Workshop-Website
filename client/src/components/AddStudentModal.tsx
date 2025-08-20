import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { X, Plus } from "lucide-react";

const addStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(40, "First name must be 40 characters or less"),
  lastName: z.string().min(1, "Last name is required").max(40, "Last name must be 40 characters or less"),
  notes: z.string().max(400, "Notes must be 400 characters or less").optional()
});

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddStudentModal({ isOpen, onClose }: AddStudentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof addStudentSchema>>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      notes: ""
    }
  });

  const addStudentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addStudentSchema>) => {
      return await apiRequest("POST", "/api/students", data);
    },
    onSuccess: () => {
      toast({
        title: "Student Added",
        description: "Your student has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Student",
        description: error.message || "An error occurred while adding the student.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof addStudentSchema>) => {
    addStudentMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Add Student</DialogTitle>
          <DialogDescription className="text-white/60">
            Add a student to your account for camp registration.
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
                disabled={addStudentMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {addStudentMutation.isPending ? "Adding..." : "Add Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}