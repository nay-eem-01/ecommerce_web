import { dateTime, releaseMonth, shortDate } from './dates'
import { tk } from './money'
import { isValidPhone, localDigits, phoneError } from './phone'

describe('tk', () => {
  it('formats taka with Indian grouping and no decimals', () => {
    expect(tk(6800)).toBe('৳ 6,800')
    expect(tk(125000.5)).toBe('৳ 1,25,001')
    expect(tk(null)).toBe('৳ 0')
  })
})

describe('phone', () => {
  it('accepts what shoppers type, with or without +88', () => {
    expect(localDigits('+880 1712-345678')).toBe('01712345678')
    expect(isValidPhone('01712345678')).toBe(true)
    expect(isValidPhone('8801712345678')).toBe(true)
  })

  it('explains what is wrong', () => {
    expect(phoneError('')).toBe('Enter a mobile number so the rider can reach you.')
    expect(phoneError('0121234567')).toBe('Use an 11-digit number starting with 01, like 01712345678.')
    expect(phoneError('01212345678')).not.toBe('')
    expect(phoneError('01912345678')).toBe('')
  })
})

describe('dates', () => {
  it('names the release month of a pre-order', () => {
    expect(releaseMonth('2027-01')).toBe('January 2027')
    expect(releaseMonth(null)).toBe('')
    expect(releaseMonth('2027-13')).toBe('')
  })

  it('shows instants in Bangladesh time', () => {
    // 20:30 UTC is 02:30 the next day in Dhaka.
    expect(shortDate('2026-10-17T20:30:00Z')).toBe('18 Oct 2026')
    expect(dateTime('2026-10-18T09:05:00Z')).toBe('18 Oct 2026, 3:05 pm')
    expect(shortDate('nope')).toBe('')
  })
})
