import { createRouteMatcher, clerkMiddleware } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/home(.*)", "/settings"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
	// API routes handle auth in their own handlers (GET returns empty data when signed out)
	if (isApiRoute(req)) return;

	if (!isPublicRoute(req)) {
		// TODO: Remove this line
		return;
		await auth.protect();
	}
});

export const config = {
	matcher: [
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		"/(api|trpc)(.*)",
	],
};
