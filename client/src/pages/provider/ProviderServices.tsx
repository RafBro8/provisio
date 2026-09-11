import { useEffect, useState, type FormEvent } from "react";
import { createService, listMyServices, updateService } from "../../api/services";
import { ApiError } from "../../api/client";
import { ErrorNote, LoadingNote, SectionTitle } from "../../components/ui";
import { CARD_CLASS, FIELD_CLASS, OUTLINE_BUTTON, SOLID_BUTTON, TEXT_BUTTON } from "../../lib/styles";
import type { Service } from "../../api/types";

interface ServiceFormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

const EMPTY_FORM: ServiceFormState = { name: "", description: "", durationMinutes: "30", price: "50" };
const SMALL_LABEL = "flex flex-col gap-1.5 text-[13px] text-muted dark:text-muted-dark";

/** The shared fields for adding or editing a service. */
function ServiceFields({
  form,
  onChange,
  required,
}: {
  form: ServiceFormState;
  onChange: (patch: Partial<ServiceFormState>) => void;
  required?: boolean;
}) {
  return (
    <>
      {/* The e2e suite fills this by its "Name" placeholder. */}
      <input
        required={required}
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className={FIELD_CLASS}
        placeholder="Name"
        aria-label="Service name"
      />
      <textarea
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
        className={FIELD_CLASS}
        placeholder="Description (optional), e.g. one-to-one video call"
        aria-label="Description"
        rows={2}
      />
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <label className={SMALL_LABEL}>
          Duration (min)
          <input
            type="number"
            min={5}
            required={required}
            value={form.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value })}
            className={`${FIELD_CLASS} font-mono`}
          />
        </label>
        <label className={SMALL_LABEL}>
          Price ($)
          <input
            type="number"
            min={0}
            required={required}
            value={form.price}
            onChange={(e) => onChange({ price: e.target.value })}
            className={`${FIELD_CLASS} font-mono`}
          />
        </label>
      </div>
    </>
  );
}

export function ProviderServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newForm, setNewForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  function load(): void {
    setIsLoading(true);
    listMyServices()
      .then((res) => setServices(res.services))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load your services"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      await createService({
        name: newForm.name,
        description: newForm.description || undefined,
        durationMinutes: Number(newForm.durationMinutes),
        price: Number(newForm.price),
      });
      setNewForm(EMPTY_FORM);
      load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Couldn't create service");
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(service: Service): void {
    setEditingId(service._id);
    setEditForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: String(service.durationMinutes),
      price: String(service.price),
    });
    setEditError(null);
  }

  async function handleSaveEdit(id: string): Promise<void> {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateService(id, {
        name: editForm.name,
        description: editForm.description || undefined,
        durationMinutes: Number(editForm.durationMinutes),
        price: Number(editForm.price),
      });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Couldn't save changes");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleToggleActive(service: Service): Promise<void> {
    try {
      await updateService(service._id, { isActive: !service.isActive });
      load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Couldn't update this service");
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <section className="flex flex-col gap-4 lg:col-span-7" aria-labelledby="services-heading">
        <SectionTitle id="services-heading">Your services</SectionTitle>
        {isLoading && services.length === 0 && <LoadingNote />}
        {loadError && <ErrorNote>{loadError}</ErrorNote>}
        {!isLoading && services.length === 0 && (
          <p className="text-muted dark:text-muted-dark">
            You haven't added any services yet. Customers can't book you until you do.
          </p>
        )}

        {services.length > 0 && (
          <ul className="flex flex-col gap-3">
            {services.map((service) => (
              <li key={service._id} className={`${CARD_CLASS} px-5 py-4 ${service.isActive ? "" : "opacity-70"}`}>
                {editingId === service._id ? (
                  <div className="flex flex-col gap-3">
                    <ServiceFields form={editForm} onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))} />
                    {editError && <ErrorNote>{editError}</ErrorNote>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(service._id)}
                        disabled={isSavingEdit}
                        className={SOLID_BUTTON}
                      >
                        {isSavingEdit ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className={OUTLINE_BUTTON}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-semibold">{service.name}</span>
                        {!service.isActive && (
                          <span className="rounded-full bg-neutral-bg px-2.5 py-1 text-[11.5px] font-semibold text-muted dark:bg-white/8 dark:text-muted-dark">
                            Hidden from customers
                          </span>
                        )}
                      </span>
                      {service.description && (
                        <span className="text-[14px] text-muted dark:text-muted-dark">{service.description}</span>
                      )}
                      <span className="font-mono text-[13.5px] text-faint dark:text-faint-dark">
                        {service.durationMinutes} min · ${service.price}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-4 pt-0.5">
                      <button type="button" onClick={() => startEdit(service)} className={TEXT_BUTTON}>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleToggleActive(service)} className={TEXT_BUTTON}>
                        {service.isActive ? "Hide" : "Show again"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lg:col-span-5" aria-labelledby="add-service-heading">
        <form onSubmit={handleCreate} className={`${CARD_CLASS} flex flex-col gap-3 px-5 py-5 sm:px-6`}>
          <h3 id="add-service-heading" className="font-display text-[1.4rem] tracking-[-0.01em]">
            Add a new service
          </h3>
          <ServiceFields form={newForm} onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))} required />
          {createError && <ErrorNote>{createError}</ErrorNote>}
          <button type="submit" disabled={isCreating} className={`mt-1 w-fit ${SOLID_BUTTON}`}>
            {isCreating ? "Adding…" : "Add service"}
          </button>
        </form>
      </section>
    </div>
  );
}
