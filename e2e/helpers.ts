import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

/** A fresh, valid mobile number per run, so tests never collide with earlier orders or accounts. */
export function freshPhone(): string {
  return '0175' + String(Date.now()).slice(-7)
}

/** Registers a fresh shopper through the local test mailbox and signs in from the emailed link. */
export async function registerShopper(page: Page, mailbox: string) {
  const email = `e2e-${crypto.randomUUID()}@example.com`
  await page.goto('/sign-in?mode=register')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send email link' }).click()
  await expect(page.getByText('Check your inbox.', { exact: false })).toBeVisible({ timeout: 15_000 })
  let link: string | undefined
  await expect.poll(() => {
    const entry = readFileSync(mailbox, 'utf8').trim().split('\n').filter(Boolean)
      .map((line) => JSON.parse(line) as { to: string; text: string })
      .reverse().find((mail) => mail.to === email)
    link = entry?.text.match(/https?:\/\/[^\s]+\/verify-email#token=[\w-]+/)?.[0]
    return Boolean(link)
  }).toBe(true)
  await page.goto(link!)
  await page.getByLabel('New password').fill('Test-password-1')
  await page.getByRole('button', { name: 'Set password and sign in' }).click()
  await page.waitForURL('**/account')
}

/** Fills step 1 of checkout. `district` other than Dhaka picks "Outside Dhaka" and then that district. */
export async function fillDelivery(page: Page, details: { name: string; phone: string; district?: string; area: string; address: string }) {
  await page.getByLabel('Mobile number').fill(details.phone)
  await page.getByLabel('Full name').fill(details.name)
  if (details.district && details.district !== 'Dhaka') {
    await page.getByText('Outside Dhaka').click()
    await page.getByLabel('Your district').selectOption(details.district)
  }
  await page.getByLabel('Area or thana').fill(details.area)
  await page.getByLabel('House, road and flat').fill(details.address)
}

/** The order number shown on a confirmation or result page. */
export async function orderNumberOnPage(page: Page): Promise<string> {
  const text = await page.locator('.done-hero-copy').innerText()
  const match = /SS-[A-Z0-9]+/.exec(text)
  expect(match, 'order number on the page').not.toBeNull()
  return match![0]
}
