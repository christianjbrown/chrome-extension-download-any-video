// The character references XML text and attribute values can hold: the five
// named ones, and any character by its number in hex or decimal.
const ENTITY = /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi;
const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);
const HEX_PREFIX = "#x";
const DECIMAL_PREFIX = "#";
const HEX = 16;
const DECIMAL = 10;

export function decodeEntities(text: string): string {
  return text.replace(ENTITY, (_, entity: string) =>
    decoded(entity.toLowerCase()),
  );
}

// A named entity, or else a numbered one.
function decoded(entity: string): string {
  return NAMED_ENTITIES.get(entity) ?? numbered(entity);
}

function numbered(entity: string): string {
  return entity.startsWith(HEX_PREFIX)
    ? String.fromCodePoint(parseInt(entity.slice(HEX_PREFIX.length), HEX))
    : String.fromCodePoint(
        parseInt(entity.slice(DECIMAL_PREFIX.length), DECIMAL),
      );
}
