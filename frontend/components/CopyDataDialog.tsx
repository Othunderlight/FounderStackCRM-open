import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../src/i18n";
import { FileText, Database, Copy } from 'lucide-react';

interface CopyDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCopy: (scope: 'partial' | 'full') => void;
}

export const CopyDataDialog = ({ isOpen, onClose, onCopy }: CopyDataDialogProps) => {
    const { t } = useTranslation();
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-[#191919] border-border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-textPrimary flex items-center gap-2">
                        <Copy className="text-accent" size={20} />
                        Copy Person Data
                    </DialogTitle>
                    <DialogDescription className="text-textSecondary text-xs">
                        Choose how much data you want to copy to your clipboard.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    <button 
                        className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-[#202020] hover:bg-[#252525] hover:border-accent/50 transition-all text-left group"
                        onClick={() => onCopy('partial')}
                    >
                        <div className="p-2 bg-accent/10 rounded-lg w-fit text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h4 className="text-textPrimary font-bold text-sm mb-1">Partial Data</h4>
                            <p className="text-textSecondary text-xs leading-relaxed">
                                Copies basic profile info (email, phone, etc.) and conversation history.
                            </p>
                        </div>
                    </button>

                    <button 
                        className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-[#202020] hover:bg-[#252525] hover:border-accent/50 transition-all text-left group"
                        onClick={() => onCopy('full')}
                    >
                         <div className="p-2 bg-green-500/10 rounded-lg w-fit text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                            <Database size={24} />
                        </div>
                        <div>
                            <h4 className="text-textPrimary font-bold text-sm mb-1">Complete Data</h4>
                            <p className="text-textSecondary text-xs leading-relaxed">
                                Copies everything including tasks, notes, opportunities, and logs.
                            </p>
                        </div>
                    </button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-border text-textSecondary hover:text-textPrimary hover:bg-[#2f2f2f]">
                        {t("common.cancel")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
