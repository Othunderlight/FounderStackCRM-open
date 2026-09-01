import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { LogOut, Mail } from "lucide-react";
import { useTranslation } from "../src/i18n";
import { useStore } from "../store";
import { cn } from "@/lib/utils";

export function InactiveAccountPage() {
	const { t } = useTranslation();
	const { logout } = useStore();

	return (
		<div className="flex flex-1 w-full items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
			<div className="flex items-center max-w-lg w-full p-8">
				<div className="relative w-full">
					{/* Top/Bottom divider lines as seen in the screenshot */}
					<div className="absolute inset-x-0 h-px bg-white/5 -top-16" />
					
					<Empty className="bg-transparent border-none p-0">
						<EmptyHeader className="space-y-6">
							<div className="flex justify-center">
								<div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/5 shadow-2xl">
									<LogOut className="w-8 h-8 text-red-500" />
								</div>
							</div>
							
							<div className="space-y-4">
								<EmptyTitle className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center">
									{t("notFound.accountInactive.title")}
								</EmptyTitle>
								
								<div className="space-y-6 max-w-sm mx-auto">
									<p className="text-center text-zinc-400 leading-relaxed">
										{t("notFound.accountInactive.description")}
									</p>
									
									<p className="text-center text-zinc-500 text-sm leading-relaxed px-4">
										{t("notFound.accountInactive.contactOwner")}
									</p>
								</div>
							</div>
						</EmptyHeader>

						<EmptyContent className="mt-12">
							<div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
								<Button 
									variant="outline" 
									className="w-full h-11 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all duration-300"
									onClick={() => window.location.href = "mailto:team@founderstack.cloud"}
								>
									<Mail className="me-2 h-4 w-4" /> {t("settings.support")}
								</Button>

								<Button 
									variant="ghost"
									className={cn(
										"w-full h-11 text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300",
										"hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
									)}
									onClick={() => logout()}
								>
									<LogOut className="me-2 h-4 w-4" /> {t("settings.logout")}
								</Button>
							</div>
						</EmptyContent>
					</Empty>
					
					<div className="absolute inset-x-0 h-px bg-white/5 -bottom-16" />
				</div>
			</div>
		</div>
	);
}
