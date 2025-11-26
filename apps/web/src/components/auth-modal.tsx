'use client';

import { SignIn } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@docstalk/ui";
import { Sparkles } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageCount: number;
}

export function AuthModal({ open, onOpenChange, messageCount }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-indigo-500 to-purple-600 rounded-full blur-lg opacity-30" />
              <div className="relative bg-background border border-border/50 p-3 rounded-full shadow-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Enjoying the conversation?
          </DialogTitle>
          <DialogDescription className="text-center">
            You've sent {messageCount} messages. Sign up or log in to continue chatting and save your conversations!
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <SignIn 
            routing="hash"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
                card: 'shadow-none',
                rootBox: 'w-full',
                formFieldInput: 'rounded-lg'
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
