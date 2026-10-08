import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from "@repo/ui";
import { ShieldCheck } from "lucide-react";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
  badgeText?: string;
}

export function AuthCard({
  title,
  description,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
  badgeText = "Audit & Compliance",
}: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-3 text-center pb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-8 ring-primary/5">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-bold text-xl tracking-tight">Hopper Audit</span>
            {badgeText && (
              <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0">
                {badgeText}
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {footerText && footerLinkText && footerLinkHref && (
        <CardFooter className="flex justify-center border-t border-border/40 pt-4 pb-4 text-xs text-muted-foreground">
          <p>
            {footerText}{" "}
            <Link
              href={footerLinkHref}
              className="font-medium text-primary hover:underline transition-colors"
            >
              {footerLinkText}
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
