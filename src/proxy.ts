import { createRouteMatcher, clerkMiddleware } from "@clerk/nextjs/server";

const isApiRoute = createRouteMatcher(["/api(.*)"]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/home(.*)",
  "/settings(.*)",
  "/rentals",
]);

export default clerkMiddleware(async (auth, req) => {
  // API routes enforce auth in their own handlers
  if (isApiRoute(req)) return;

  const path = req.nextUrl.pathname;
  // Public catalogue detail pages, but not /rentals/add
  const isPublicRentalDetail =
    /^\/rentals\/[^/]+$/.test(path) && path !== "/rentals/add";

  if (!isPublicRoute(req) && !isPublicRentalDetail) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
