import type { z } from "zod";
import type { Block } from "../render/model";
import { suggestTitle } from "./titles";
import type { ContractContext, LinkKey, TemplateDefinition } from "./types";

/**
 * Wraps a typed template into the untyped registry shape. Stored data (contracts.data) is
 * validated again before building, with the template defaults filled in, so documents still
 * render if a template gained a field after a contract was saved.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseStored<S extends z.ZodType>(schema: S, defaults: Record<string, unknown>, raw: unknown): z.output<S> {
  const merged: Record<string, unknown> = { ...defaults };
  if (isRecord(raw)) for (const [k, v] of Object.entries(raw)) if (v !== undefined) merged[k] = v;
  const first = schema.safeParse(merged);
  if (first.success) return first.data;
  // Replace the values that no longer validate with their defaults and try again.
  for (const issue of first.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") merged[key] = defaults[key] ?? null;
  }
  const second = schema.safeParse(merged);
  // Builders read every value defensively (str/num/bool), so raw values are a safe last resort.
  return second.success ? second.data : (merged as z.output<S>);
}

type TypedTemplate<S extends z.ZodType> = Omit<TemplateDefinition, "schema" | "build" | "issues" | "validate" | "suggestTitle"> & {
  schema: S;
  build(data: z.output<S>, ctx: ContractContext): Block[];
  issues?(data: z.output<S>, ctx: ContractContext): string[];
  validate?(data: z.output<S>, linked: Partial<Record<LinkKey, number | null>>): Record<string, string>;
};

export function defineTemplate<S extends z.ZodType>(def: TypedTemplate<S>): TemplateDefinition {
  const { schema, build, issues, validate, ...rest } = def;
  const parse = (raw: unknown) => parseStored(schema, def.defaults, raw);
  return {
    ...rest,
    schema: schema as z.ZodType<Record<string, unknown>>,
    suggestTitle: (input) => suggestTitle(def.id, input),
    build: (raw, ctx) => build(parse(raw), ctx),
    issues: (raw, ctx) => (issues ? issues(parse(raw), ctx) : []),
    validate: validate ? (data, linked) => validate(data as z.output<S>, linked) : undefined,
  };
}
