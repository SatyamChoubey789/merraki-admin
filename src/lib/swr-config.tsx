"use client";
import { SWRConfig } from "swr";
import api from "./axios";
import { AxiosError } from "axios";

const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 5000,
        keepPreviousData: true,
        // ✅ Only retry on 5xx — not on 401/403 which are expected
        shouldRetryOnError: (error: AxiosError) => {
          const status = error?.response?.status;
          if (!status) return false; // network errors: don't retry (backend may be down)
          return status >= 500;
        },
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        onError: (error: AxiosError) => {
          const status = error?.response?.status;
          // 401 handled by axios interceptor
          if (status === 401 || status === 403) return;
          console.error("[SWR]", status, error.config?.url);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}