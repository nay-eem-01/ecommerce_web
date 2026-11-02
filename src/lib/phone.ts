/** Bangladeshi mobile numbers, as the backend accepts them: 11 digits starting with 01[3-9]. */
const LOCAL = /^01[3-9]\d{8}$/

/** The digits a shopper typed, without a +88 / 88 country prefix: "+880 1712-345678" -> "01712345678". */
export function localDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length === 13) digits = digits.slice(2)
  return digits
}

export function isValidPhone(input: string): boolean {
  return LOCAL.test(localDigits(input))
}

/** Field message for a phone input, or "" when it is fine. Same words as the backend. */
export function phoneError(input: string): string {
  const digits = localDigits(input)
  if (!digits) return 'Enter a mobile number so the rider can reach you.'
  return LOCAL.test(digits) ? '' : 'Use an 11-digit number starting with 01, like 01712345678.'
}
