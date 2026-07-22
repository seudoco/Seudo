import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-6 py-16">
      <Link href="/" className="mb-10 font-heading text-2xl font-semibold tracking-tight">
        Seudo
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
