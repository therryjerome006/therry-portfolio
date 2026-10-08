"use client";

export function ConfirmSubmit({
  action,
  message,
  label,
  fields,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  label: string;
  fields: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className="text-sm font-semibold text-muted">
        {label}
      </button>
    </form>
  );
}
