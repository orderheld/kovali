"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * File field with a drop zone. The native file input stays in the form (visually hidden but
 * focusable), so the upload also works without JavaScript and is sent with the form data.
 */
export function FileDrop({
  id,
  label,
  accept,
  formats,
  optional,
  hint,
  error,
  onSelect,
}: {
  /** Also the field name. */
  id: string;
  label: string;
  /** Value of the input's accept attribute. */
  accept: string;
  /** Shown in the drop zone, e.g. "PDF, höchstens 4 MB". */
  formats: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  /** Called with the chosen file, or undefined when it is removed. */
  onSelect?: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  function choose(next: File | undefined) {
    setFile(next);
    onSelect?.(next);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (!dropped || !inputRef.current) return;
    // Put the dropped file into the real input, so it is part of the form data.
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    inputRef.current.files = transfer.files;
    choose(dropped);
  }

  function remove() {
    if (inputRef.current) inputRef.current.value = "";
    choose(undefined);
    inputRef.current?.focus();
  }

  return (
    <div>
      <p id={`${id}-label`} className="mb-2 block text-[0.9375rem] font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-slate"> (optional)</span> : null}
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="file"
          accept={accept}
          aria-labelledby={`${id}-label ${id}-zone`}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => choose(e.currentTarget.files?.[0])}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-5 py-6 transition-colors",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
            dragging ? "border-blue bg-blue/[0.06]" : "border-line bg-mist/50 hover:border-blue/50 hover:bg-mist",
            file && !error && "border-solid border-blue/40 bg-white",
            error && "border-red-600/60",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-md",
              file && !error ? "bg-blue/10 text-blue" : "bg-white text-blue shadow-[0_0_0_1px_var(--color-line)]",
            )}
          >
            {file && !error ? <CheckCircle2 className="size-5" /> : <FileUp className="size-5" />}
          </span>
          <span id={`${id}-zone`} className={cn("min-w-0", file && "pr-10")}>
            {file ? (
              <>
                <span className="block truncate font-medium text-ink">{file.name}</span>
                <span className="block text-sm text-slate">
                  {formatSize(file.size)} · <span className="text-blue underline underline-offset-2">Andere Datei wählen</span>
                </span>
              </>
            ) : (
              <>
                <span className="block font-medium text-ink">
                  {/* Touch devices cannot drag files, so they only see "Datei auswählen". */}
                  <span className="hidden pointer-fine:inline">Datei hierher ziehen oder </span>
                  <span className="pointer-fine:hidden">Datei </span>
                  <span className="text-blue underline underline-offset-2">auswählen</span>
                </span>
                <span className="block text-sm text-slate">{formats}</span>
              </>
            )}
          </span>
        </label>
        {file ? (
          <button
            type="button"
            onClick={remove}
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:bg-mist hover:text-ink"
          >
            <X aria-hidden className="size-4" />
            <span className="sr-only">Datei entfernen</span>
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-slate">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
