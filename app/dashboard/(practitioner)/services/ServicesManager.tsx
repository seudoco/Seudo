"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceForm, type ServiceFormValues } from "@/components/dashboard/ServiceForm";
import { specialtyColor } from "@/lib/specialty-colors";

interface Service extends ServiceFormValues {
  id: string;
  is_active: boolean;
}

const EMPTY: ServiceFormValues = {
  title: "",
  description: "",
  duration_minutes: 60,
  price_usd: 50,
  specialty_id: null,
};

export function ServicesManager({
  initialServices,
  allSpecialties,
}: {
  initialServices: Service[];
  allSpecialties: { id: number; name: string }[];
}) {
  const specialtyName = (id: number | null) => allSpecialties.find((s) => s.id === id)?.name;
  const [services, setServices] = useState<Service[]>(initialServices);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function createService(values: ServiceFormValues): Promise<string | null> {
    const res = await fetch("/api/practitioner/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Couldn't create service";
    setServices((s) => [data, ...s]);
    setCreating(false);
    return null;
  }

  async function updateService(id: string, values: ServiceFormValues): Promise<string | null> {
    const res = await fetch(`/api/practitioner/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Couldn't update service";
    setServices((s) => s.map((svc) => (svc.id === id ? data : svc)));
    setEditingId(null);
    return null;
  }

  async function toggleActive(service: Service) {
    const res = await fetch(`/api/practitioner/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !service.is_active }),
    });
    const data = await res.json();
    if (res.ok) setServices((s) => s.map((svc) => (svc.id === service.id ? data : svc)));
  }

  async function deleteService(id: string) {
    setDeleteError(null);
    const res = await fetch(`/api/practitioner/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "Couldn't delete service");
      return;
    }
    setServices((s) => s.filter((svc) => svc.id !== id));
  }

  return (
    <div className="mt-8 flex max-w-xl flex-col gap-4">
      {deleteError && (
        <p className="text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      )}

      {services.map((service) =>
        editingId === service.id ? (
          <ServiceForm
            key={service.id}
            initial={service}
            allSpecialties={allSpecialties}
            submitLabel="Save changes"
            onCancel={() => setEditingId(null)}
            onSubmit={(values) => updateService(service.id, values)}
          />
        ) : (
          <div key={service.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground break-words">{service.title}</p>
                {!service.is_active && <Badge variant="secondary">Inactive</Badge>}
                {specialtyName(service.specialty_id) && (
                  <Badge
                    variant="outline"
                    className="border-transparent"
                    style={{
                      backgroundColor: specialtyColor(specialtyName(service.specialty_id)!).bg,
                      color: specialtyColor(specialtyName(service.specialty_id)!).text,
                    }}
                  >
                    {specialtyName(service.specialty_id)}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.duration_minutes} min ·{" "}
                <span className="font-medium text-success">${service.price_usd}</span>
              </p>
              {service.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words">{service.description}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setEditingId(service.id)}>
                Edit
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => toggleActive(service)}>
                {service.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={() => deleteService(service.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )
      )}

      {creating ? (
        <ServiceForm
          initial={EMPTY}
          allSpecialties={allSpecialties}
          submitLabel="Create service"
          onCancel={() => setCreating(false)}
          onSubmit={createService}
        />
      ) : (
        <Button variant="outline" className="w-fit cursor-pointer" onClick={() => setCreating(true)}>
          Add a service
        </Button>
      )}
    </div>
  );
}
