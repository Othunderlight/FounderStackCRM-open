import React from 'react';
import { useStore } from '../store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { cn } from '../lib/utils';

export const GlobalConfirmDialog = () => {
  const { confirmDialog, closeConfirm, language } = useStore();
  const isRTL = language === "ar";

  return (
    <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && closeConfirm()}>
      <AlertDialogContent className={cn(isRTL && "text-right")}>
        <AlertDialogHeader className={cn(isRTL && "text-right sm:text-right")}>
          <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={cn("sm:justify-end")}>
          {isRTL ? (
            <>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirm();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {confirmDialog.confirmText}
              </AlertDialogAction>
              <AlertDialogCancel onClick={closeConfirm} className="hover:bg-muted hover:text-muted-foreground">
                {confirmDialog.cancelText}
              </AlertDialogCancel>
            </>
          ) : (
            <>
              <AlertDialogCancel onClick={closeConfirm} className="hover:bg-muted hover:text-muted-foreground">
                {confirmDialog.cancelText}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirm();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {confirmDialog.confirmText}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
