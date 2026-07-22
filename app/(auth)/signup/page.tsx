import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { SignUpForm } from "./SignUpForm";
import type { UserRole } from "@/types/database";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const selectedRole: UserRole | null = role === "client" || role === "practitioner" ? role : null;

  if (!selectedRole) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center font-heading text-2xl font-semibold text-foreground">
          Join Seudo
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          Are you here to book sessions, or to offer them?
        </p>
        <div className="mt-2 flex flex-col gap-3">
          <RoleChoiceCard
            href="/signup?role=client"
            title="I'm a client"
            description="Book sessions with vetted practitioners."
          />
          <RoleChoiceCard
            href="/signup?role=practitioner"
            title="I'm a practitioner"
            description="List your services and take bookings."
          />
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return <SignUpForm role={selectedRole} />;
}

function RoleChoiceCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer border-border transition-colors hover:border-foreground">
        <CardContent className="py-2">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
