import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SheetContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextProps | undefined>(undefined);

export const Sheet: React.FC<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ open, onOpenChange, children }) => {
  const [localOpen, setLocalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : localOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setLocalOpen;

  return (
    <SheetContext.Provider value={{ open: isOpen, setOpen: setIsOpen }}>
      {children}
    </SheetContext.Provider>
  );
};

export const SheetTrigger: React.FC<{
  asChild?: boolean;
  children: React.ReactElement<any>;
}> = ({ children }) => {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetTrigger must be used within Sheet');

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      if (children.props && children.props.onClick) children.props.onClick(e);
      context.setOpen(true);
    },
  });
};

export const SheetContent: React.FC<{
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
  children: React.ReactNode;
}> = ({ side = 'right', className, children }) => {
  const context = useContext(SheetContext);
  if (!context) throw new Error('SheetContent must be used within Sheet');

  if (!context.open) return null;

  const sideClasses = {
    left: 'left-0 top-0 bottom-0 h-full w-full max-w-md border-r animate-slide-in-left',
    right: 'right-0 top-0 bottom-0 h-full w-full max-w-md border-l animate-slide-in-right',
    top: 'top-0 left-0 right-0 w-full h-96 border-b animate-slide-in-top',
    bottom: 'bottom-0 left-0 right-0 w-full h-96 border-t animate-slide-in-bottom',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay background */}
      <div
        onClick={() => context.setOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      />
      {/* Sliding Panel */}
      <div className={cn(
        'fixed z-10 border-slate-800 bg-slate-950 p-6 shadow-xl text-slate-100 flex flex-col focus:outline-none',
        sideClasses[side],
        className
      )}>
        {children}
        <button
          onClick={() => context.setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 mt-4 text-left border-b border-slate-800 pb-4', className)} {...props} />
);

export const SheetTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight text-slate-100', className)} {...props} />
);

export const SheetDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-slate-400 mt-1', className)} {...props} />
);
