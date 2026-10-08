"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, cn } from "@repo/ui";
import { sidebarRoutes } from "./routes";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex flex-col border-r bg-background", className)}>
      <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-xl tracking-tight text-primary">HopperAudit</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {sidebarRoutes.map((route, index) => {
            const Icon = route.icon;
            
            // Handle simple routes without children
            if (!route.children) {
              const isActive = pathname === route.path || pathname?.startsWith(route.path + "/");
              
              return (
                <Link
                  key={index}
                  href={route.path || "#"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive ? "bg-muted text-primary font-semibold" : ""
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {route.title}
                </Link>
              );
            }

            // Handle parent routes
            return (
              <div key={index} className="flex flex-col gap-1 py-2">
                <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground font-semibold uppercase text-xs tracking-wider">
                  <Icon className="h-4 w-4" />
                  {route.title}
                </div>
                {route.children.map((child, childIdx) => {
                  const isChildActive = pathname === child.path;
                  return (
                    <Link
                      key={childIdx}
                      href={child.path}
                      className={cn(
                        "flex items-center gap-3 rounded-lg pl-9 pr-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        isChildActive ? "bg-muted text-primary font-semibold" : ""
                      )}
                    >
                      {child.title}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}