import Link from "next/link";
import { RoleGuard } from "@/components/layout/RoleGuard";

const NAV_ITEMS = [
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/availability", label: "Availability" },
  { href: "/dashboard/onboarding", label: "Listing status" },
];

export default function PractitionerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredRole="practitioner">
      <div className="flex flex-col gap-8 sm:flex-row">
        <nav className="flex shrink-0 gap-1 sm:w-44 sm:flex-col">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </RoleGuard>
  );
}
