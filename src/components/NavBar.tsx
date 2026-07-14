"use client";

import { usePathname, useRouter } from "next/navigation";
import { SVGProps, ReactNode } from "react";
import {
	FiHome,
	FiNavigation,
	FiBox,
	FiShoppingCart,
	FiSettings,
} from "react-icons/fi";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";

type Route = {
	name: string;
	href: string;
	icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
};

const routesAdmin: Route[] = [
	{ name: "Home", href: "/home", icon: (p) => <FiHome {...p} /> },
	{ name: "Monitor", href: "/monitor", icon: (p) => <FiNavigation {...p} /> },
	{ name: "Rentals", href: "/rentals", icon: (p) => <FiBox {...p} /> },
	{ name: "Orders", href: "/orders", icon: (p) => <FiShoppingCart {...p} /> },
	{ name: "Settings", href: "/settings", icon: (p) => <FiSettings {...p} /> },
];

const routesUser: Route[] = [
	{ name: "Home", href: "/home", icon: (p) => <FiHome {...p} /> },
	{ name: "Monitor", href: "/monitor", icon: (p) => <FiNavigation {...p} /> },
	{ name: "Rentals", href: "/rentals", icon: (p) => <FiBox {...p} /> },
	{ name: "Orders", href: "/orders", icon: (p) => <FiShoppingCart {...p} /> },
	{ name: "Settings", href: "/settings", icon: (p) => <FiSettings {...p} /> },
];

export default function NavBar() {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useUser();
	const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";
	const routes = isAdmin ? routesAdmin : routesUser;

	const isActive = (href: string) => pathname.startsWith(href);

	return (
		<motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }} 
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-30 w-full"
        >
			<div className="flex w-full items-stretch border-t border-theme-border/40 bg-theme-card/80 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.25)]">
				{routes.map((route) => {
					const active = isActive(route.href);
					return (
						<button
							key={route.href}
							type="button"
							onClick={() => router.push(route.href)}
							className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 px-1 transition-all duration-200 ${
								active
									? "text-theme-accent bg-theme-accent/10"
									: "text-theme-text/45 hover:text-theme-text/80 hover:bg-theme-background/30"
							}`}
						>
							{active && (
								<motion.span 
                                    layoutId="navTab"
                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-theme-accent" 
                                />
							)}
							<route.icon style={{ fontSize: "1.25rem" }} />
							<span className="text-[10px] md:text-xs font-semibold tracking-wide mt-1">
								{route.name}
							</span>
						</button>
					);
				})}
			</div>
		</motion.div>
	);
}
