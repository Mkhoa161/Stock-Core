"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthProvider from "@/providers/AuthProvider";
import { ReactNode } from "react";

const queryClient = new QueryClient();

export default function QueryProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}