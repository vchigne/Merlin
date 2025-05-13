import { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { Toast } from '@/components/ui/toast';

interface NotificationToastProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  open: boolean;
  children?: ReactNode;
}

export default function NotificationToast({
  type,
  title,
  description,
  action,
  onClose,
  open,
  children
}: NotificationToastProps) {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'info':
        return 'border-blue-400 dark:border-blue-600';
      case 'success':
        return 'border-green-400 dark:border-green-600';
      case 'warning':
        return 'border-amber-400 dark:border-amber-600';
      case 'error':
        return 'border-red-400 dark:border-red-600';
      default:
        return '';
    }
  };

  return (
    <Toast
      open={open}
      onOpenChange={(open) => {
        if (!open && onClose) onClose();
      }}
      className={`border-l-4 ${getTypeClass()}`}
    >
      <div className="flex">
        <div className="flex-shrink-0 pt-0.5">
          <div className="w-10 h-10 flex items-center justify-center">
            {getIcon()}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <ToastTitle>{title}</ToastTitle>
          {description && (
            <ToastDescription>{description}</ToastDescription>
          )}
          {children}
          {action && (
            <div className="mt-2">
              <Button
                onClick={action.onClick}
                variant="outline"
                size="sm"
                className="h-8 px-3"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
        <ToastClose />
      </div>
    </Toast>
  );
}
