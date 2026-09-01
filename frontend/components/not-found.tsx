import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Compass, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../src/i18n";

export function NotFoundPage() {
	const { t } = useTranslation();
	return (
		<div className="flex flex-1 w-full items-center justify-center min-h-[400px]">
			<div className="flex items-center">
				<div className="relative">
					<div className="absolute inset-x-0 h-px bg-border -top-8" />
					<Empty>
						<EmptyHeader>
							<EmptyTitle className="font-black font-mono text-8xl text-textPrimary">
								404
							</EmptyTitle>
							<EmptyDescription className="text-nowrap text-textSecondary">
								{t("notFound.pageNotFound")}
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<div className="flex gap-2">
								<Button asChild>
									<Link to="/">
										<Home className="me-2 h-4 w-4" /> {t("notFound.goHome")}
									</Link>
								</Button>

								<Button asChild variant="outline">
									<Link to="/people/all">
										<Compass className="me-2 h-4 w-4" /> {t("notFound.explore")}
									</Link>
								</Button>
							</div>
						</EmptyContent>
					</Empty>
					<div className="absolute inset-x-0 h-px bg-border -bottom-8" />
				</div>
			</div>
		</div>
	);
}
