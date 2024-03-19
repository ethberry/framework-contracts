export const DND = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
export const SPECIAL = ["strength", "perception", "endurance", "charisma", "intelligence", "agility", "luck"];

export const encodeNumbers = (numbers: Array<number>, size = 32) => {
  let encoded = 0n;
  numbers.reverse().forEach((number, i) => {
    encoded = encoded | (BigInt(number) << BigInt(i * size));
  });
  return encoded;
};

export const decodeNumber = (encoded: bigint, size = 32) => {
  const mask = (1n << BigInt(size)) - 1n;
  return new Array(256 / size)
    .fill(null)
    .map((_e, i) => {
      const shr = encoded >> BigInt(i * size);
      const masked = shr & mask;
      return Number(masked);
    })
    .reverse();
};

export const encodeTraits = (traits: Record<string, number>) => {
  return encodeNumbers(Object.values(traits));
};

export const decodeTraits = (encoded: bigint, traits = DND) => {
  return decodeNumber(encoded)
    .slice(-traits.length)
    .reduceRight((memo, value, i) => ({ [traits[i]]: value, ...memo }), {} as Record<string, number>);
};
