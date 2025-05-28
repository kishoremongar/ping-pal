"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import DeviceProvider from "./DeviceProvider";

type WrapperProviderProps = Readonly<{
  children: ReactNode;
}>;

export default function WrapperProvider({ children }: WrapperProviderProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      mutations: {
        retry: 1,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <DeviceProvider>{children}</DeviceProvider>
    </QueryClientProvider>
  );
}
