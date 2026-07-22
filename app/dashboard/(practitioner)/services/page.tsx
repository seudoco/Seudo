import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServicesManager } from "./ServicesManager";

export default async function ServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("practitioner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Your services</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What clients can book with you, and for how long and how much.
      </p>
      <ServicesManager
        initialServices={(services ?? []).map((s) => ({ ...s, description: s.description ?? "" }))}
      />
    </div>
  );
}
