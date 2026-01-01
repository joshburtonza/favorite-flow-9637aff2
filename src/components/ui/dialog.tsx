import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Disable full-screen mobile behavior */
    disableMobileFullScreen?: boolean;
  }
>(({ className, children, disableMobileFullScreen = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Base styles
        "fixed z-50 grid gap-4 border bg-background shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // Mobile: Full screen with safe areas
        !disableMobileFullScreen && [
          "inset-0 max-h-[100dvh] w-full rounded-none p-4 pt-14",
          "overflow-y-auto overscroll-contain",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          // Support safe areas for notched devices
          "pb-[calc(1rem+env(safe-area-inset-bottom))]",
        ],
        // Desktop: Centered modal
        !disableMobileFullScreen && [
          "md:left-[50%] md:top-[50%] md:inset-auto",
          "md:max-h-[85vh] md:w-full md:max-w-lg",
          "md:translate-x-[-50%] md:translate-y-[-50%]",
          "md:rounded-lg md:p-6",
          "md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]",
          "md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]",
          "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
        ],
        // When mobile full screen is disabled, use standard centered modal
        disableMobileFullScreen && [
          "left-[50%] top-[50%] max-h-[85vh] w-full max-w-lg",
          "translate-x-[-50%] translate-y-[-50%] rounded-lg p-6",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        ],
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close 
        className={cn(
          // Base close button styles
          "absolute rounded-full opacity-70 ring-offset-background transition-all",
          "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none",
          "data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
          // Mobile: Larger touch target, positioned at top
          !disableMobileFullScreen && [
            "right-3 top-3 h-10 w-10 flex items-center justify-center",
            "bg-muted/80 backdrop-blur-sm",
            "md:right-4 md:top-4 md:h-auto md:w-auto md:p-1 md:bg-transparent md:backdrop-blur-none",
          ],
          disableMobileFullScreen && "right-4 top-4 p-1",
        )}
      >
        <X className={cn(
          !disableMobileFullScreen ? "h-5 w-5 md:h-4 md:w-4" : "h-4 w-4"
        )} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      // Mobile: Sticky header
      "sticky top-0 -mx-4 -mt-14 px-4 pt-4 pb-3 bg-background/95 backdrop-blur-sm z-10 border-b border-border/50",
      "md:static md:mx-0 md:mt-0 md:px-0 md:pt-0 md:pb-0 md:bg-transparent md:backdrop-blur-none md:border-0",
      className
    )} 
    {...props} 
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2",
      // Mobile: Sticky footer with larger buttons
      "sticky bottom-0 -mx-4 px-4 py-4 bg-background/95 backdrop-blur-sm z-10 border-t border-border/50 mt-4",
      "md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-0 md:mt-0",
      // Touch-friendly button spacing
      "[&>button]:min-h-[44px] [&>button]:touch-manipulation",
      "md:[&>button]:min-h-0",
      className
    )} 
    {...props} 
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      // Mobile: Larger title
      "text-xl md:text-lg",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description 
    ref={ref} 
    className={cn(
      "text-sm text-muted-foreground",
      // Mobile: Slightly larger text
      "text-base md:text-sm",
      className
    )} 
    {...props} 
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
