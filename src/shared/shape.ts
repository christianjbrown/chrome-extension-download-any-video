// Checks on values from elsewhere, like messages and storage, which could be
// anything at all.

// A test one field's value has to pass.
export type FieldTest = (value: unknown) => boolean;

// The test for each field a record has to have.
export type Shape = Readonly<Record<string, FieldTest>>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const isString: FieldTest = (value) => typeof value === "string";

export const isNumber: FieldTest = (value) => typeof value === "number";

export const isArray: FieldTest = (value) => Array.isArray(value);

export const isFunction: FieldTest = (value) => typeof value === "function";

// An object, or null where there is none.
export const isRecordOrNull: FieldTest = (value) =>
  value === null || isRecord(value);

// A list whose every item passes the test.
export const everyItem =
  (test: FieldTest): FieldTest =>
  (value) =>
    Array.isArray(value) && value.every((item) => test(item));

// One of a closed set of values.
export const oneOf =
  (values: readonly unknown[]): FieldTest =>
  (value) =>
    values.includes(value);

export const equalTo =
  (expected: unknown): FieldTest =>
  (value) =>
    value === expected;

// Whether every field of the shape passes its test.
export function fits(record: Record<string, unknown>, shape: Shape): boolean {
  return Object.entries(shape).every(([field, test]) => test(record[field]));
}
