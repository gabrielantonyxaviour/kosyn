"use client";

import { ThirdwebProvider, AutoConnect } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { client, patientWallet, providerWallet, chain } from "@/lib/thirdweb";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AutoConnect
          client={client}
          wallets={[patientWallet, providerWallet]}
          chain={chain}
          timeout={5000}
        />
        {children}
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
