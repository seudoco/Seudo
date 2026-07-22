import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  return (
    <LoginForm
      redirectTo={redirect ?? "/dashboard"}
      callbackError={error === "auth_callback_failed"}
    />
  );
}
