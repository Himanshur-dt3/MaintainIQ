import { NextResponse } from "next/server";

import { auth } from "@/src/auth";

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth?.user?.id);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/api/") && !isAuthenticated) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  if (pathname !== "/" && pathname !== "/login" && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
