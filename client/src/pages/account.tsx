import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User, 
  Users, 
  Calendar, 
  CreditCard, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Settings,
  Mail,
  Shield,
  FileText
} from "lucide-react";
import { AddStudentModal } from '@/components/AddStudentModal';
import { EditStudentModal } from '@/components/EditStudentModal';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  notes?: string;
  createdAt: string;
}

interface Week {
  id: string;
  label: string;
  priceCents: number;
  capacity: number;
}

interface Registration {
  id: string;
  studentId: string;
  weekId: string;
  status: string;
  paymentType?: string;
  amountPaidCents?: number;
  balanceDueCents?: number;
  createdAt: string;
}

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  receivedAt: string;
}

interface RosterRecord {
  ts: string;
  week_id: string;
  week_label: string;
  student_name: string;
  parent_email: string;
  parent_name: string;
  amount_cents: number;
  payment_intent: string;
  currency: string;
  session_id: string;
}

export default function Account() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const logoutMutation = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Additional emails state
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState("");
  
  // Add email function
  const handleAddEmail = () => {
    if (newEmailInput.trim() && newEmailInput.includes('@') && !additionalEmails.includes(newEmailInput.trim())) {
      setAdditionalEmails([...additionalEmails, newEmailInput.trim()]);
      setNewEmailInput("");
      toast({
        title: "Email Added",
        description: `${newEmailInput} will receive camp notifications.`,
      });
    } else if (!newEmailInput.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    } else if (additionalEmails.includes(newEmailInput.trim())) {
      toast({
        title: "Email Already Added",
        description: "This email is already in your additional emails list.",
        variant: "destructive",
      });
    }
  };
  
  // Remove email function
  const handleRemoveEmail = (emailToRemove: string) => {
    setAdditionalEmails(additionalEmails.filter(email => email !== emailToRemove));
    toast({
      title: "Email Removed",
      description: `${emailToRemove} will no longer receive notifications.`,
    });
  };

  // Profile update form schema
  const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address")
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || ""
    }
  });

  // Update form default values when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || ""
      });
    }
  }, [user, profileForm]);

  // Delete student handler
  const handleDeleteStudent = async (student: Student) => {
    // Check if student has any registrations
    const studentRegistrations = registrations.filter(reg => reg.studentId === student.id);
    
    if (studentRegistrations.length > 0) {
      toast({
        title: "Cannot Delete Student",
        description: `${student.firstName} ${student.lastName} is registered for camp and cannot be deleted. Students with active registrations are protected from deletion.`,
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? This action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      await apiRequest("DELETE", `/api/students/${student.id}`);
      toast({
        title: "Student Deleted",
        description: `${student.firstName} ${student.lastName} has been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    } catch (error: any) {
      toast({
        title: "Failed to Delete Student",
        description: error.message || "An error occurred while deleting the student.",
        variant: "destructive",
      });
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: isAuthenticated,
  });

  // Fetch weeks
  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["/api/weeks"],
    enabled: isAuthenticated,
  });

  // Fetch registrations (all for admin, user-specific for parents)
  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: user?.role === 'admin' ? ["/api/admin/registrations"] : ["/api/registrations"],
    enabled: isAuthenticated,
  });

  // Fetch payments
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: isAuthenticated,
  });

  // Group registrations by week for admin users
  const registrationsByWeek = useMemo(() => {
    if (!isAuthenticated || user?.role !== 'admin' || !registrations) {
      return {};
    }
    
    return registrations.reduce((acc, registration) => {
      const weekId = registration.weekId;
      if (!acc[weekId]) {
        acc[weekId] = [];
      }
      acc[weekId].push(registration);
      return acc;
    }, {} as Record<string, typeof registrations>);
  }, [registrations, isAuthenticated, user?.role]);

  // Get week labels for display
  const getWeekLabel = (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    return week ? week.label : `Week ${weekId}`;
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      return await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  // Handle balance payment - go directly to Stripe
  const handleBalancePayment = async (registrationIds: string[]) => {
    if (registrationIds.length === 0) return;
    
    setIsProcessingPayment(true);
    try {
      const response = await apiRequest("POST", "/api/balance-checkout", {
        registrationIds
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWeekName = (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    return week?.label || weekId;
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : studentId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-custom via-indigo-custom to-teal-custom">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-4">
              Welcome Back, {user?.firstName} {user?.lastName}!
            </h1>
            <p className="text-white/80 text-lg">
              Manage your family's A Cappella Workshop experience
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-black/20 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
              <User className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-white/20">
              <Users className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="registrations" className="data-[state=active]:bg-white/20">
              <Calendar className="w-4 h-4 mr-2" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white/20">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/20">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-white/20">
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-sky-custom" />
                    Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{students.length}</div>
                  <p className="text-white/60">registered students</p>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-teal-custom" />
                    Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{registrations.length}</div>
                  <p className="text-white/60">total registrations</p>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                    Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {registrations.filter(r => r.status === "paid" || r.status === "deposit_paid").length}
                  </div>
                  <p className="text-white/60">confirmed spots</p>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-orange-400" />
                    Unpaid Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    ${((registrations.reduce((sum, r) => sum + (r.balanceDueCents || 0), 0)) / 100).toFixed(0)}
                  </div>
                  <p className="text-white/60">remaining balance</p>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-indigo-custom" />
                    Total Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    ${(payments.reduce((sum, p) => sum + p.amountCents, 0) / 100).toFixed(0)}
                  </div>
                  <p className="text-white/60">across all registrations</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Registrations</CardTitle>
                <CardDescription className="text-white/60">
                  Your latest camp registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {registrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No registrations yet</p>
                    <p className="text-white/40 text-sm">Register your students for upcoming camps</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {registrations.slice(0, 5).map((registration) => (
                      <div key={registration.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <p className="text-white font-medium">{getStudentName(registration.studentId)}</p>
                          <p className="text-white/60 text-sm">{getWeekName(registration.weekId)}</p>
                        </div>
                        {getStatusBadge(registration.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Unpaid Balances Section */}
            {registrations.some(r => (r.balanceDueCents || 0) > 0) && (
              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-orange-400" />
                    Outstanding Balances
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Complete your deposit payments to secure your spots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {registrations
                      .filter(r => (r.balanceDueCents || 0) > 0)
                      .map((registration) => (
                      <div key={registration.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <p className="text-white font-medium">{getStudentName(registration.studentId)}</p>
                          <p className="text-white/60 text-sm">{getWeekName(registration.weekId)}</p>
                          <p className="text-orange-400 text-sm font-medium">
                            Balance Due: ${((registration.balanceDueCents || 0) / 100).toFixed(2)}
                          </p>
                        </div>
                        <Button 
                          className="btn-gradient" 
                          size="sm"
                          onClick={() => handleBalancePayment([registration.id])}
                          disabled={isProcessingPayment}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Balance
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Your Students</h2>
              <Button 
                className="btn-gradient"
                onClick={() => setShowAddStudentModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>

            {studentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : students.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardContent className="text-center py-12">
                  <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No students yet</h3>
                  <p className="text-white/60 mb-6">Add your first student to get started with registrations</p>
                  <Button 
                    className="btn-gradient"
                    onClick={() => setShowAddStudentModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Student
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((student) => {
                  // Find registrations for this student
                  const studentRegistrations = registrations.filter(reg => reg.studentId === student.id);
                  
                  return (
                    <Card key={student.id} className="bg-black/20 backdrop-blur-lg border border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">{student.firstName} {student.lastName}</CardTitle>
                        {student.notes && (
                          <CardDescription className="text-white/60">{student.notes}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Registrations Section */}
                        {studentRegistrations.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-white/80">Camp Registrations</h4>
                            {studentRegistrations.map((registration) => {
                              const week = weeks.find(w => w.id === registration.weekId);
                              const statusColor = registration.status === 'paid' ? 'text-green-400' : 
                                                registration.status === 'deposit_paid' ? 'text-yellow-400' : 
                                                'text-orange-400';
                              const statusText = registration.status === 'paid' ? 'Fully Paid' :
                                               registration.status === 'deposit_paid' ? 'Deposit Paid' :
                                               'Pending Payment';
                              
                              return (
                                <div key={registration.id} className="bg-white/5 rounded-lg p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="text-white font-medium text-sm">{week?.label || 'Unknown Week'}</p>
                                      <p className={`text-xs ${statusColor}`}>{statusText}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {registration.paymentType === 'deposit' ? 'Deposit' : 'Full Payment'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-white/60">
                                    <div className="flex justify-between">
                                      <span>Paid:</span>
                                      <span className="text-green-400">${((registration.amountPaidCents ?? 0) / 100).toFixed(2)}</span>
                                    </div>
                                    {(registration.balanceDueCents ?? 0) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Balance Due:</span>
                                        <span className="text-orange-400">${((registration.balanceDueCents ?? 0) / 100).toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                            <p className="text-white/40 text-sm">No camp registrations yet</p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-2 border-t border-white/10">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              setEditingStudent(student);
                              setShowEditStudentModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                            onClick={() => handleDeleteStudent(student)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Registrations Tab */}
          <TabsContent value="registrations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Camp Registrations</h2>
              <Button className="btn-gradient">
                <Plus className="w-4 h-4 mr-2" />
                New Registration
              </Button>
            </div>

            {registrations.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardContent className="text-center py-12">
                  <Calendar className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No registrations yet</h3>
                  <p className="text-white/60 mb-6">Register your students for summer camp sessions</p>
                  <Button 
                    className="btn-gradient" 
                    onClick={() => setLocation("/camp-registration")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start Registration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {registrations.map((registration) => (
                  <Card key={registration.id} className="bg-black/20 backdrop-blur-lg border border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-white">
                            {getStudentName(registration.studentId)}
                          </h3>
                          <p className="text-white/80">{getWeekName(registration.weekId)}</p>
                          <p className="text-white/60 text-sm">
                            Registered on {new Date(registration.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          {getStatusBadge(registration.status)}
                          {registration.status === "pending" && (
                            <div className="space-x-2">
                              <Button 
                                size="sm" 
                                className="btn-gradient"
                                onClick={() => handleBalancePayment([registration.id])}
                                disabled={isProcessingPayment}
                              >
                                Pay Now
                              </Button>
                              <Button size="sm" variant="outline" className="bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20">
                                Cancel
                              </Button>
                            </div>
                          )}
                          {registration.status === "deposit_paid" && (registration.balanceDueCents ?? 0) > 0 && (
                            <div className="space-y-2">
                              <div className="text-right">
                                <p className="text-orange-300 text-sm font-medium">
                                  Balance Due: ${((registration.balanceDueCents ?? 0) / 100).toFixed(2)}
                                </p>
                                <p className="text-white/60 text-xs">
                                  Paid: ${((registration.amountPaidCents ?? 0) / 100).toFixed(2)} deposit
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                className="btn-gradient"
                                onClick={() => handleBalancePayment([registration.id])}
                                disabled={isProcessingPayment}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Pay Balance
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Payment History</h2>

            {payments.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
                <CardContent className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No payments yet</h3>
                  <p className="text-white/60">Your payment history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <Card key={payment.id} className="bg-black/20 backdrop-blur-lg border border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-white">
                            Payment #{payment.id.slice(-8)}
                          </h3>
                          <p className="text-white/60 text-sm">
                            {new Date(payment.receivedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            ${(payment.amountCents / 100).toFixed(2)}
                          </p>
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Account Settings</h2>
            
            {/* Payment Summary Card */}
            <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                  Payment Summary
                </CardTitle>
                <CardDescription className="text-white/60">
                  Your payment history and current balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-400/20">
                    <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-400">
                      ${registrations.reduce((total, reg) => total + (reg.amountPaidCents ?? 0) / 100, 0).toFixed(2)}
                    </p>
                    <p className="text-white/60 text-sm">Total Paid</p>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-400/20">
                    <CreditCard className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-400">
                      ${payments.reduce((total, payment) => total + payment.amountCents / 100, 0).toFixed(2)}
                    </p>
                    <p className="text-white/60 text-sm">Total Spend</p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-400/20">
                    <Clock className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-400">
                      ${registrations.reduce((total, reg) => total + (reg.balanceDueCents ?? 0) / 100, 0).toFixed(2)}
                    </p>
                    <p className="text-white/60 text-sm">Outstanding Balance</p>
                  </div>
                </div>

                {/* Payment History */}
                {payments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-white font-semibold mb-3">Recent Payments</h4>
                    <div className="space-y-2">
                      {payments.slice(0, 5).map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white text-sm font-medium">Payment via Stripe</p>
                            <p className="text-white/60 text-xs">{new Date(payment.receivedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">${(payment.amountCents / 100).toFixed(2)}</p>
                            <p className="text-white/60 text-xs capitalize">{payment.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="w-5 h-5 mr-2 text-sky-custom" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-white/60">
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">First Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                                placeholder="Enter your first name"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                                placeholder="Enter your last name"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                              placeholder="Enter your email address"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        className="btn-gradient"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <LogOut className="w-5 h-5 mr-2 text-red-400" />
                  Account Actions
                </CardTitle>
                <CardDescription className="text-white/60">
                  Manage your account security and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
                </Button>
              </CardContent>
            </Card>
            
            {/* Email Management */}
            <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-sky-custom" />
                  Email Management
                </CardTitle>
                <CardDescription className="text-white/60">
                  Manage additional email addresses for notifications and communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Primary Email Display */}
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Primary Email</label>
                  <div className="flex items-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <Mail className="w-4 h-4 text-sky-custom mr-3" />
                    <span className="text-white font-medium">{user?.email}</span>
                    <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">Primary</Badge>
                  </div>
                </div>

                {/* Additional Emails Section */}
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Additional Emails</label>
                  <div className="space-y-2 mb-3">
                    {additionalEmails.length === 0 ? (
                      <div className="flex items-center p-3 bg-white/5 rounded-lg border border-white/10">
                        <Mail className="w-4 h-4 text-white/60 mr-3" />
                        <span className="text-white/60">No additional emails added</span>
                      </div>
                    ) : (
                      additionalEmails.map((email, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-white/60 mr-3" />
                            <span className="text-white">{email}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEmail(email)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Add Email Form */}
                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Enter additional email address"
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1"
                    />
                    <Button 
                      onClick={handleAddEmail}
                      className="bg-sky-custom/20 border border-sky-custom/30 text-sky-200 hover:bg-sky-custom/30"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Email
                    </Button>
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    Additional emails will receive camp notifications and updates
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {user?.role === 'admin' && (
            <TabsContent value="admin" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Camp Registrations</h2>
                  <p className="text-white/60">View all student registrations by week</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin Access
                </Badge>
              </div>

              <div className="space-y-6">
                {weeks.map((week) => {
                  const weekRegistrations = registrationsByWeek[week.id] || [];
                  const totalRegistrations = weekRegistrations.length;
                  const totalRevenue = weekRegistrations.reduce((sum, reg) => {
                    const week = weeks.find(w => w.id === reg.weekId);
                    const weekPrice = week ? week.priceCents : 0;
                    return sum + (weekPrice - (reg.balanceDueCents || 0));
                  }, 0);
                  const outstandingBalance = weekRegistrations.reduce((sum, reg) => {
                    return sum + (reg.balanceDueCents || 0);
                  }, 0);
                  
                  return (
                    <Card key={week.id} className="bg-black/20 backdrop-blur-lg border border-white/10">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-white flex items-center">
                              <Calendar className="w-5 h-5 mr-2 text-teal-custom" />
                              {week.label}
                            </CardTitle>
                            <CardDescription className="text-white/80 text-lg font-medium space-x-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                {totalRegistrations} registrations
                              </span>
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-300">
                                ${(totalRevenue / 100).toFixed(2)} collected
                              </span>
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-500/20 text-orange-300">
                                ${(outstandingBalance / 100).toFixed(2)} remaining
                              </span>
                            </CardDescription>
                          </div>
                          <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                            {totalRegistrations} students
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-left py-3 text-white/80 font-medium">Student Name</th>
                                <th className="text-left py-3 text-white/80 font-medium">Parent Name</th>
                                <th className="text-left py-3 text-white/80 font-medium">Parent Email</th>
                                <th className="text-right py-3 text-white/80 font-medium">Total Cost</th>
                                <th className="text-right py-3 text-white/80 font-medium">Cost Remaining</th>
                              </tr>
                            </thead>
                            <tbody>
                              {weekRegistrations.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-white/60">
                                    No registrations for this week yet
                                  </td>
                                </tr>
                              ) : (
                                weekRegistrations
                                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                  .map((registration) => {
                                    const student = students.find(s => s.id === registration.studentId);
                                    const parentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'Unknown';
                                    const parentEmail = user?.email || 'Unknown';
                                    
                                    return (
                                      <tr key={registration.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-3 text-white font-medium">
                                          {student ? `${student.firstName} ${student.lastName}`.trim() : 'Unknown Student'}
                                        </td>
                                        <td className="py-3 text-white">
                                          {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : parentName}
                                        </td>
                                        <td className="py-3 text-white/60">
                                          {parentEmail}
                                        </td>
                                        <td className="py-3 text-right">
                                          <span className="text-blue-400 font-medium">
                                            ${((weeks.find(w => w.id === registration.weekId)?.priceCents || 0) / 100).toFixed(2)}
                                          </span>
                                        </td>
                                        <td className="py-3 text-right">
                                          {registration.balanceDueCents && registration.balanceDueCents > 0 ? (
                                            <span className="text-orange-400 font-medium">
                                              ${(registration.balanceDueCents / 100).toFixed(2)}
                                            </span>
                                          ) : (
                                            <span className="text-green-400 font-medium">$0.00</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>

      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={showEditStudentModal}
        onClose={() => {
          setShowEditStudentModal(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
      />
    </div>
  );
}