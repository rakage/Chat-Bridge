"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteSocialConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  platform: "Facebook" | "Instagram" | "Telegram";
  connectionName: string;
  isDeleting?: boolean;
}

export function DeleteSocialConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  platform,
  connectionName,
  isDeleting = false,
}: DeleteSocialConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Delete {platform} Connection?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-base">
            <p>
              Are you sure you want to disconnect{" "}
              <span className="font-semibold text-gray-900">{connectionName}</span>?
            </p>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-semibold text-amber-900 mb-2">
                ⚠️ This action will:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                <li>Remove all conversations from this {platform} account</li>
                <li>Delete all associated messages permanently</li>
                <li>Disconnect webhook subscriptions</li>
                <li>Stop receiving new messages</li>
              </ul>
            </div>

            <p className="text-sm text-red-600 font-semibold">
              ⚠️ This action cannot be undone!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Deleting...
              </>
            ) : (
              <>Delete Connection</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
