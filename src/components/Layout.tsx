import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      {/* @ts-expect-error - Using dvh for better mobile viewport handling */}
      <div className="flex min-h-[100dvh] w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full transition-all duration-200 ease-in-out">
          <div className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
