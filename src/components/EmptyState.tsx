import { isValidElement, type ReactNode, type ComponentType } from 'react';
import { CalendarX, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode | LucideIcon | ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return <CalendarX className="w-10 h-10 text-[#6600FF]" />;
    if (isValidElement(icon)) return icon;
    // Handle React component functions or forwardRef objects (e.g. Lucide icons with { $$typeof, render })
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
    ) {
      const IconComponent = icon as ComponentType<{ className?: string }>;
      return <IconComponent className="w-10 h-10 text-[#6600FF]" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-[#6600FF]/10 flex items-center justify-center mb-4">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  );
}
