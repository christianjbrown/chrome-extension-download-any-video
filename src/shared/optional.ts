// Small steps over values that may be missing, so each caller keeps to one
// decision of its own.

// What use makes of the value, or nothing when there is no value.
export function ifDefined<T, R>(
  value: T | undefined,
  use: (value: T) => R,
): R | undefined {
  return value === undefined ? undefined : use(value);
}

// The first answer find gives, asking each item in turn and none after it.
export function firstFound<T, R>(
  items: readonly T[],
  find: (item: T) => R | undefined,
): R | undefined {
  return items.reduce<R | undefined>(
    (found, item) => found ?? find(item),
    undefined,
  );
}

// The value, or an error saying why there is none.
export function required<T>(value: T | undefined, problem: string): T {
  if (value === undefined) {
    throw new Error(problem);
  }
  return value;
}

// The value as a list of one, or an empty list when there is none.
export function asList<T>(value: T | undefined): T[] {
  return value === undefined ? [] : [value];
}
