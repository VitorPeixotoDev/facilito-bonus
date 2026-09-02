export const CNPJ_ALPHANUMERIC_REGEX =
  /^([A-Z0-9]{2}\.?[A-Z0-9]{3}\.?[A-Z0-9]{3}\/?[A-Z0-9]{4}-?[0-9]{2})$/i;

const PERSON_NAME_REGEX = /^[\p{L}]+(?:[ '\-][\p{L}]+)+$/u;
const COMPANY_NAME_REGEX = /^[\p{L}\p{N} .,&/\-()'+]+$/u;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeCnpj(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function maskPersonName(value: string): string {
  return value
    .replace(/[\n\r\t]/g, " ")
    .replace(/[^\p{L}'\-\s]/gu, "")
    .replace(/ {2,}/g, " ");
}

export function maskCompanyName(value: string): string {
  return value
    .replace(/[\n\r\t]/g, " ")
    .replace(/[^\p{L}\p{N} .,&/\-()'+]/gu, "")
    .replace(/ {2,}/g, " ");
}

export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);

  if (digits.length <= 3) {
    return part1;
  }

  if (digits.length <= 6) {
    return `${part1}.${part2}`;
  }

  if (digits.length <= 9) {
    return `${part1}.${part2}.${part3}`;
  }

  return `${part1}.${part2}.${part3}-${part4}`;
}

export function maskCnpj(value: string): string {
  const raw = normalizeCnpj(value);
  let masked = "";

  for (const char of raw) {
    const alnumLength = masked.replace(/[^A-Z0-9]/g, "").length;

    if (alnumLength >= 14) {
      break;
    }

    if (alnumLength >= 12 && !/\d/.test(char)) {
      continue;
    }

    if (alnumLength === 2 || alnumLength === 5) {
      masked += ".";
    } else if (alnumLength === 8) {
      masked += "/";
    } else if (alnumLength === 12) {
      masked += "-";
    }

    masked += char;
  }

  return masked;
}

function cpfCheckDigit(digits: string, length: number): number {
  let sum = 0;

  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (length + 1 - index);
  }

  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);

  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  return (
    cpfCheckDigit(digits, 9) === Number(digits[9]) &&
    cpfCheckDigit(digits, 10) === Number(digits[10])
  );
}

export function isValidCnpj(value: string): boolean {
  return CNPJ_ALPHANUMERIC_REGEX.test(value.trim());
}

export function isValidPersonName(value: string): boolean {
  const name = value.trim();
  return name.length >= 5 && name.length <= 120 && PERSON_NAME_REGEX.test(name);
}

export function isValidCompanyName(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 150 && COMPANY_NAME_REGEX.test(name);
}
