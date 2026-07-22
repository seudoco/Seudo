export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Check your inbox</h1>
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to the email address you signed up with. Click it to
        activate your account, then come back and log in.
      </p>
    </div>
  );
}
