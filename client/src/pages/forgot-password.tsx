import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");
  
  // Future-proofing: Check for token in URL
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Future-proofing: Check for token parameter
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (resetToken) {
      setToken(resetToken);
      // If token exists, skip email step and go directly to password reset
      setStep("password");
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verify email exists in database before proceeding
      await apiRequest("POST", "/api/verify-email", { email });
      setStep("password");
    } catch (error: any) {
      toast({
        title: "Account not found",
        description: "Account not found. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error", 
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 10) {
      toast({
        title: "Error",
        description: "Password must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/reset-password-direct", { 
        email, 
        password,
        token // Include token if present (for future use)
      });
      
      toast({
        title: "Success",
        description: "Your password has been reset successfully. You can now log in with your new password.",
      });

      // Redirect to login after success
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    } catch (error: any) {
      if (error.message.includes("Account not found")) {
        toast({
          title: "Error",
          description: "Account not found. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-custom via-indigo-custom to-teal-custom flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="bg-black/20 backdrop-blur-lg border border-white/10 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
              {step === "email" ? "Find Your Account" : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-white/70">
              {step === "email" 
                ? "Enter your email to reset your password" 
                : "Enter your new password below"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="your@email.com"
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full btn-gradient-secondary"
                  disabled={isLoading}
                  data-testid="button-find-account"
                >
                  {isLoading ? "Finding Account..." : "Continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                      placeholder="Enter new password (min. 10 characters)"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {email && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-white/80 text-sm">
                      Resetting password for: <span className="font-medium text-white">{email}</span>
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full btn-gradient-secondary"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login">
                <span className="text-sky-custom hover:text-teal-custom text-sm cursor-pointer">
                  Back to Sign In
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}