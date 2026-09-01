import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../src/i18n";

interface AccessDeniedPageProps {
    title?: string;
    description?: string;
}

export function AccessDeniedPage({ title, description }: AccessDeniedPageProps) {
	const { t } = useTranslation();
    const navigate = useNavigate();

	return (
		<div className="flex flex-1 w-full items-center justify-center min-h-[400px]">
			<div className="flex items-center">
				<div className="relative">
					<div className="absolute inset-x-0 h-px bg-border -top-8" />
					<Empty>
						<EmptyHeader>
                            <div className="flex justify-center mb-4">
                                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
							        <ShieldAlert className="h-12 w-12 text-red-500" />
                                </div>
                            </div>
							<EmptyTitle className="font-black font-mono text-5xl text-textPrimary uppercase tracking-tighter">
								{title || t("accessDenied.title")}
							</EmptyTitle>
							<EmptyDescription className="text-textSecondary max-w-sm mx-auto">
								{description || t("accessDenied.description")}
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<div className="flex gap-2">
								<Button onClick={() => navigate(-1)} variant="outline">
									<ArrowLeft className="me-2 h-4 w-4" /> {t("accessDenied.goBack")}
								</Button>

								<Button asChild>
									<Link to="/">
										<Home className="me-2 h-4 w-4" /> {t("accessDenied.goHome")}
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
