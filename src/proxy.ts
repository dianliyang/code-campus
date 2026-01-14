import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPublicPage = req.nextUrl.pathname === "/" || isLoginPage;

  console.log(`[Middleware] Path: ${req.nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);

  if (!isLoggedIn && !isPublicPage) {
    console.log("[Middleware] Redirecting to /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/courses", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Match all request paths except for the ones starting with:
  // - api/auth (auth routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // - public file extensions (.svg, .png, .jpg, etc.)
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.svg$).*)"],
};