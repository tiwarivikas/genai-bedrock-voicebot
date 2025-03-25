"use client";

import {
  WithAuthenticatorProps,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import SideNav from "../ui/sidenav";
import TopNav from "../ui/topNav";
import ConfigureAmplifyClientSide from "@/components/ConfigureAmplify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider, useUser } from './UserContext';
import { PowerIcon } from "@heroicons/react/24/outline";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
    },
  },
});

function Layout(
  { children }: { children: React.ReactNode },
  { signOut, user }: WithAuthenticatorProps,
) {
  return (
    <main className="flex min-h-screen flex-col p-1">
      <UserProvider>
        <TopNav />
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden mt-1">
          <QueryClientProvider client={queryClient}>
            <div className="flex-grow p-2 md:overflow-y-auto md:p-2">
              {children}
            </div>
          </QueryClientProvider>
          <Toaster />
        </div>
      </UserProvider>
    </main>
  );
}

export default withAuthenticator(Layout);
