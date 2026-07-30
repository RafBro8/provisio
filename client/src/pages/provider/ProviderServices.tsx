import { useEffect, useState, type FormEvent } from "react";
import { createService, listMyServices, updateService } from "../../api/services";
import { ApiError } from "../../api/client";
import type { Service } from "../../api/types";

interface ServiceFormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

const EMPTY_FORM: ServiceFormState = { name: "", description: "", durationMinutes: "30", price: "50" };
const inputClass = "rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

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
    <div>
      <h3 className="font-medium">Your services</h3>
      {isLoading && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {loadError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{loadError}</p>}

      <ul className="mt-3 flex flex-col gap-3">
        {services.map((service) => (
          <li key={service._id} className="rounded border border-slate-300 p-3 dark:border-slate-700">
            {editingId === service._id ? (
              <div className="flex flex-col gap-2">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Name"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputClass}
                  placeholder="Description"
                  rows={2}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={5}
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(service._id)}
                    disabled={isSavingEdit}
                    className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                  >
                    {isSavingEdit ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{service.name}</p>
                  {service.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{service.description}</p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {service.durationMinutes} min · ${service.price} · {service.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(service)} className="text-sm underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleToggleActive(service)} className="text-sm underline">
                    {service.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {!isLoading && services.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">You haven't added any services yet.</p>
        )}
      </ul>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex flex-col gap-2 rounded border border-slate-300 p-4 dark:border-slate-700"
      >
        <h4 className="font-medium">Add a new service</h4>
        <input
          required
          value={newForm.name}
          onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
          className={inputClass}
          placeholder="Name"
        />
        <textarea
          value={newForm.description}
          onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
          className={inputClass}
          placeholder="Description (optional)"
          rows={2}
        />
        <div className="flex gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Duration (min)
            <input
              type="number"
              min={5}
              required
              value={newForm.durationMinutes}
              onChange={(e) => setNewForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            Price ($)
            <input
              type="number"
              min={0}
              required
              value={newForm.price}
              onChange={(e) => setNewForm((f) => ({ ...f, price: e.target.value }))}
              className={inputClass}
            />
          </label>
        </div>
        {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
        <button
          type="submit"
          disabled={isCreating}
          className="mt-1 w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {isCreating ? "Adding…" : "Add service"}
        </button>
      </form>
    </div>
  );
}
