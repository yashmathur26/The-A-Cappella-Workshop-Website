import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  emailVerified: boolean;
  stripeCustomerId?: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retryOnMount: false,
    refetchOnWindowFocus: false,
    throwOnError: false, // Don't throw on 401 errors
  });

  // Consider authentication resolved if we have data OR if we got a 401 error (meaning not authenticated)
  const isResolved = user !== undefined || (error && error.message.includes('401'));

  return {
    user,
    isLoading: isLoading && !isResolved,
    isAuthenticated: !!user,
    isParent: user?.role === "parent",
    isAdmin: user?.role === "admin",
    error,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/auth/login", credentials);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate auth queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; password: string; linkPurchases?: boolean }) => {
      const response = await apiRequest("POST", "/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate auth queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
      window.location.href = "/";
    },
  });
}