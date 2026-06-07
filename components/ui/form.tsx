import { clsx } from "clsx";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
};

export function FormField({ id, label, required, help, error, children }: FieldProps) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-zinc-100" htmlFor={id}>
        {label} <span className={required ? "text-aureate" : "text-zinc-500"}>{required ? "required" : "optional"}</span>
      </label>
      {children}
      {help ? <InlineHelp>{help}</InlineHelp> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

const inputClass = "w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-zinc-600 focus:border-mana";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}

export function TextAreaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("min-h-28", inputClass, props.className)} />;
}

export function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputClass, props.className)} />;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  help
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <label className="flex items-start gap-3 text-sm font-semibold text-zinc-100" htmlFor={id}>
        <input id={id} className="mt-1 h-4 w-4 accent-mana" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {help ? <p className="mt-2 text-xs leading-5 text-zinc-500">{help}</p> : null}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p> : null}
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

export function InlineHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-zinc-500">{children}</p>;
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-crimson/30 bg-crimson/10 p-2 text-sm text-crimson">{children}</p>;
}

export function SubmitBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/10 bg-[#090911]/95 p-4 backdrop-blur sm:static sm:mx-0 sm:rounded-lg sm:border sm:bg-black/20">{children}</div>;
}

