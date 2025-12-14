import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-gap-3 justify-between">
      <div className="flex items-gap-3">
        <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
        <p className="text-red-200">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
}
