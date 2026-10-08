"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@repo/ui/tooltip";
import { SmoothScroll } from "@/components/smoth-scroller";
import { SessionProvider, useSession, signOut } from "next-auth/react";

import { useEffect, useRef, useCallback } from "react";


function SessionTracker() {
    const { data: session } = useSession();

    useEffect(() => {
        if ((session as any)?.error === "RefreshAccessTokenError") {
            signOut({ callbackUrl: "/auth/login?error=SessionExpired" });
        }
    }, [session]);

    return null;
}

/**
 * Polls /api/v1/auth/session-check every 15 seconds.
 * If the backend returns 401 (session was invalidated by the bouncer),
 * it immediately signs the user out and redirects to the login page.
 */
function SessionGuard() {
    const { data: session, status, update } = useSession();
    const isSigningOut = useRef(false);

    const checkSession = useCallback(async () => {
        if (status !== "authenticated" || isSigningOut.current) return;

        let accessToken = (session?.user as any)?.accessToken as string | undefined;
        if (!accessToken) return;

        const sessionCheck = async (token: string) =>
            fetch("/api/v1/auth/session-check", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
                credentials: "include",
            });

        try {
            let res = await sessionCheck(accessToken);

            if (res.status === 401) {
                const refreshed = await update();
                const nextToken = (refreshed?.user as { accessToken?: string } | undefined)
                    ?.accessToken;
                if (nextToken && nextToken !== accessToken) {
                    accessToken = nextToken;
                    res = await sessionCheck(accessToken);
                }
            }

            if (res.status === 401 && !isSigningOut.current) {
                isSigningOut.current = true;
                signOut({ callbackUrl: "/auth/login?error=SessionExpired" });
            }
        } catch {
            // Network error — skip this cycle, retry on next interval
        }
    }, [session, status, update]);

    useEffect(() => {
        if (status !== "authenticated") return;

        // Check immediately on mount
        checkSession();

        // Then poll every 15 seconds
        const interval = setInterval(checkSession, 60_000); // 60 seconds — avoid hammering the server
        return () => clearInterval(interval);
    }, [status, checkSession]);

    return null;
}

/**
 * Re-validates the session when the user returns to a tab
 * that was idle/backgrounded — prevents stale-token logouts.
 */
function SessionRefresher() {
    const { update } = useSession();

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                update(); // Silently refresh JWT
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [update]);

    return null;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of zero mouse/keyboard response

/**
 * Tracks mouse, keyboard, click, and scroll events.
 * Resets inactivity timer on active input, auto-refreshes session for active users,
 * and logs out ONLY when user is inactive for 15+ consecutive minutes.
 */
function InactivityGuard() {
    const { status, update } = useSession();
    const lastActivityRef = useRef<number>(Date.now());
    const lastRefreshRef = useRef<number>(Date.now());

    useEffect(() => {
        if (status !== "authenticated") return;

        const handleUserActivity = () => {
            lastActivityRef.current = Date.now();
        };

        const events = [
            "mousemove",
            "keydown",
            "mousedown",
            "scroll",
            "touchstart",
        ];
        events.forEach((event) =>
            window.addEventListener(event, handleUserActivity, { passive: true }),
        );

        const interval = setInterval(() => {
            const now = Date.now();
            const inactiveTime = now - lastActivityRef.current;

            if (inactiveTime >= INACTIVITY_TIMEOUT_MS) {
                // User inactive for 15 minutes -> log out
                signOut({ callbackUrl: "/auth/login?error=SessionExpired" });
            } else if (now - lastRefreshRef.current > 2 * 60 * 1000) {
                // User is active -> keep session alive continuously
                lastRefreshRef.current = now;
                update();
            }
        }, 10_000);

        return () => {
            events.forEach((event) =>
                window.removeEventListener(event, handleUserActivity),
            );
            clearInterval(interval);
        };
    }, [status, update]);

    return null;
}

function UserSync() {
    const { data: session } = useSession();

    useEffect(() => {
        const token = session?.accessToken || (session?.user as any)?.accessToken;
        if (token) {
            import("./api").then(({ setAuthToken }) => setAuthToken(token));
        } else {
            import("./api").then(({ setAuthToken }) => setAuthToken(null));
        }
    }, [session]);

    return null;
}


export default function Provider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (

        <SessionProvider refetchInterval={4 * 60} refetchOnWindowFocus={false}>
            <SessionTracker />
            <SessionGuard />
            <SessionRefresher />
            <InactivityGuard />
            <UserSync />
            <TooltipProvider>

                <SmoothScroll>
                    {children}
                    <Toaster position="bottom-center" richColors duration={2000} />
                </SmoothScroll>

            </TooltipProvider>
        </SessionProvider>

    );
}
