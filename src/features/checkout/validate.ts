import { phoneError } from '../../lib/phone'

export type FieldId = 'fullName' | 'phone' | 'area' | 'addressLine' | 'email'

export const LABELS: Record<FieldId, string> = {
  fullName: 'Full name',
  phone: 'Mobile number',
  area: 'Area or thana',
  addressLine: 'House, road and flat',
  email: 'Email',
}

/** The prototype's field messages (the backend uses the same words). "" when the value is fine. */
export function validate(id: FieldId, raw: string): string {
  const v = raw.trim()
  switch (id) {
    case 'fullName':
      return v.length >= 2 ? '' : 'Enter the name the rider should ask for.'
    case 'phone':
      return phoneError(v)
    case 'area':
      return v ? '' : 'Enter your area or thana.'
    case 'addressLine':
      return v.length >= 5 ? '' : 'Add a house and road number so the rider can find you.'
    case 'email':
      return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '' : 'This email looks incomplete. Check for the @ and the domain.'
  }
}
