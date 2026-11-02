import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

/** A fresh, valid mobile number per run, so tests never collide with earlier orders or accounts. */
export function freshPhone(): string {
  return '0175' + String(Date.now()).slice(-7)
}

/**
 * The latest development SMS code sent to `phone`, from the backend log line
 * "[DEV SMS - not sent] to +8801...: 632210 is your Senpai Supply sign-in code. It expires in 5 minutes."
 */
export function otpFromLog(logFile: string, phone: string): string | null {
  const tail = phone.slice(1)
  const line = readFileSync(logFile, 'utf8')
    .split('\n')
    .filter((l) => l.includes('[DEV SMS - not sent]') && l.includes(tail))
    .at(-1)
  return line ? (/: (\d{6}) is your/.exec(line)?.[1] ?? null) : null
}

export async function fillDelivery(page: Page, details: { name: string; phone: string; district?: string; area: string; address: string }) {
  await page.getByLabel('Full name').fill(details.name)
  await page.getByLabel('Mobile number').fill(details.phone)
  if (details.district) await page.getByLabel('District').selectOption(details.district)
  await page.getByLabel('Area or thana').fill(details.area)
  await page.getByLabel('House, road and flat').fill(details.address)
}

/** The order number shown on a confirmation or result page. */
export async function orderNumberOnPage(page: Page): Promise<string> {
  const text = await page.locator('.done').innerText()
  const match = /SS-[A-Z0-9]+/.exec(text)
  expect(match, 'order number on the page').not.toBeNull()
  return match![0]
}
