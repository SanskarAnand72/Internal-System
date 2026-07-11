import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // ── Always pass through NextAuth API routes ────────────────────────────────
  // (handled by the matcher, but explicit guard just in case)
  if (pathname.startsWith("/api/auth")) return null;

  // ── Public routes — no auth required ──────────────────────────────────────
  // /login   — the sign-in page itself
  // /invite  — public invitation landing page
  const isPublicRoute = pathname === "/login" || pathname === "/invite";

  if (isPublicRoute) {
    // If already logged in and trying to visit /login, redirect to dashboard.
    // CRITICAL: We do NOT check workspaceId here. The JWT callback is responsible
    // for ensuring workspaceId exists; by the time the user is on /login they
    // either need to authenticate or already are — send them straight to /.
    if (isLoggedIn && pathname === "/login") {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    return null;
  }

  // ── Require authentication for everything else ─────────────────────────────
  if (!isLoggedIn) {
    // Preserve the intended destination so we can redirect back after login
    const loginUrl = new URL("/login", req.nextUrl);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return Response.redirect(loginUrl);
  }

  // ── /join — allow through for invited members even without workspace ────────
  // The join page will resolve the invitation token and then redirect to /.
  if (pathname === "/join") {
    return null;
  }

  // ── All authenticated routes — let them pass ───────────────────────────────
  // IMPORTANT: We deliberately do NOT gate on `hasWorkspace` here.
  //
  // Reason: `req.auth` in the middleware is read from the lightweight edge JWT
  // (via auth.config.js, no DB access). On the very first sign-in the workspace
  // is created inside the Node.js `jwt` callback in auth.js — the middleware
  // runs BEFORE that token is refreshed on the client, so workspaceId can
  // briefly be null even for a valid owner. Redirecting to /login at that point
  // creates the loop: logged-in → no workspace → /login → logged-in → /.
  //
  // The JWT callback in auth.js already guarantees it auto-creates a workspace
  // for any user that is missing one. The client session will contain workspaceId
  // within milliseconds of the first page load. No redirect gating needed.
  return null;
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/auth         (NextAuth internals — handled internally by Auth.js)
     * - /api/team/accept  (public invitation token validation — no session needed)
     * - /_next/static     (static assets)
     * - /_next/image      (image optimisation)
     * - /favicon.ico
     */
    "/((?!api/auth|api/team/accept|_next/static|_next/image|favicon.ico).*)",
  ],
};
