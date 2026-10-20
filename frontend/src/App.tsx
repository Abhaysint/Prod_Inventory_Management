import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle2, ShieldCheck, Database, Layers } from "lucide-react";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-xl w-full border-border/80 shadow-lg bg-card">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  StockSense
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Inventory Management System &bull; Frontend Scaffold
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Step 1 Scaffold & Foundation Verified</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>React 19 + Vite + TypeScript</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Tailwind CSS v4 CSS-First</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Arctic Frost Theme Tokens</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>TanStack Query v5 Configured</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Axios Interceptors Configured</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>shadcn/ui Radix Primitives</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-md border border-border bg-card">
                <Layers className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <span className="font-medium text-foreground">Strict TS</span>
                <p className="text-[10px] text-muted-foreground">strict: true</p>
              </div>
              <div className="p-2.5 rounded-md border border-border bg-card">
                <Database className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <span className="font-medium text-foreground">Query Cache</span>
                <p className="text-[10px] text-muted-foreground">staleTime: 60s</p>
              </div>
              <div className="p-2.5 rounded-md border border-border bg-card">
                <ShieldCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <span className="font-medium text-foreground">Bearer Auth</span>
                <p className="text-[10px] text-muted-foreground">auto-attached</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
