import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/router";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends LinkProps {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, href, ...props }, ref) => {
    const router = useRouter();
    const hrefPath = typeof href === "string" ? href : href.pathname ?? "";
    const isActive = router.pathname === hrefPath;

    return <Link ref={ref} href={href} className={cn(className, isActive && activeClassName)} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
