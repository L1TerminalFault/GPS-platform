"use client";

import { SignInButton, UserButton, Show } from "@clerk/nextjs";

const VERSION_STRING = "1.0";

export default function TitleBar() {
	return (
		<div className="fixed top-0 left-0 right-0 z-90 flex justify-center pt-5 px-4 pointer-events-none">
			<div className="pointer-events-auto flex items-center justify-between gap-4 rounded-full px-6 pr-3 py-2.5 shadow-lg shadow-black/30 backdrop-blur-xl bg-theme-card/80 border border-theme-border/30 text-base md:text-lg min-w-[min(100%,320px)] max-w-7xl w-full">
				<div className="truncate font-semibold flex items-center gap-2">
					XPlatform{" "}
					<span className="text-xs text-theme-text/50 font-normal mt-0.5">
						v{VERSION_STRING}
					</span>
				</div>

				<div className="flex shrink-0 items-center gap-2">
				<Show when="signed-in">
						<UserButton
							showName
							appearance={{
								elements: {
									userButtonOuterIdentifier: {
										color: "gray",
									},
								},
							}}
						/>
					</Show>

					<Show when="signed-out">
						<SignInButton mode="modal">
							<div className="cursor-pointer rounded-full bg-theme-accent px-4 py-1.5 text-sm font-semibold text-theme-background transition-colors hover:opacity-90">
								Sign In
							</div>
						</SignInButton>
					</Show>
				</div>
			</div>
		</div>
	);
}
