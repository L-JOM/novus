import { User, Shield } from "lucide-react";
import type { UserRole } from "@/types/novus";

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSelector = ({ currentRole, onRoleChange }: RoleSelectorProps) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onRoleChange('sales_rep')}
        className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border ${
          currentRole === 'sales_rep'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
        }`}
      >
        <User size={14} />
        Sales Rep
      </button>
      <button
        onClick={() => onRoleChange('manager')}
        className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border ${
          currentRole === 'manager'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
        }`}
      >
        <Shield size={14} />
        Manager
      </button>
    </div>
  );
};
