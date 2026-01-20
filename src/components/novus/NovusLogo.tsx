import { Shield } from "lucide-react";

export const NovusLogo = ({ size = "default" }: { size?: "small" | "default" | "large" }) => {
  const sizeClasses = {
    small: "text-lg",
    default: "text-2xl",
    large: "text-4xl",
  };

  const iconSizes = {
    small: 16,
    default: 24,
    large: 36,
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Shield 
          size={iconSizes[size]} 
          className="text-primary" 
          strokeWidth={1.5}
        />
        <div className="absolute inset-0 bg-primary/20 blur-lg" />
      </div>
      <span className={`font-mono font-semibold tracking-[0.3em] ${sizeClasses[size]}`}>
        NOVUS
      </span>
    </div>
  );
};
