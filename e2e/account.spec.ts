import { expect, test } from '@playwright/test'
import { freshPhone, otpFromLog } from './helpers.ts'

const LOG = process.env.E2E_APP_LOG

test('sign in with a texted code, keep the guest cart and hearts, and see the order in the account', async ({ page }) => {
  test.skip(!LOG, 'Set E2E_APP_LOG to the backend log file to read the development SMS code')

  // As a guest: one item in the cart and one heart.
  await page.goto('/shop/bottles')
  await page.getByRole('button', { name: /Add Mecha tritan shaker/ }).click()
  await page.getByRole('button', { name: /Save Ramen cat kids bottle/ }).click()

  const phone = freshPhone()
  await page.goto('/sign-in?back=/checkout')
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  await expect.poll(() => otpFromLog(LOG!, phone)).not.toBeNull()
  await page.getByLabel('6-digit code').fill(otpFromLog(LOG!, phone)!)

  // Back at checkout, signed in, with the merged cart and the phone filled in.
  await page.waitForURL('**/checkout')
  await expect(page.getByText(/Signed in as/)).toBeVisible()
  await expect(page.getByLabel('Mobile number')).toHaveValue(phone)
  await expect(page.locator('.co-summary')).toContainText('Mecha tritan shaker')
  await page.getByLabel('Full name').fill('E2E Member')
  await page.getByLabel('Area or thana').fill('Uttara')
  await page.getByLabel('House, road and flat').fill('House 7, Sector 4')
  await page.getByRole('button', { name: /Place order/ }).click()
  await expect(page.getByRole('heading', { name: 'Order placed. Thank you, E2E.' })).toBeVisible()

  // The account has the order, the heart and the saved address; the session survives a reload. (Wait for the
  // load's own session restore to finish first: a reload in the middle of it loses the rotated refresh token,
  // which only a backend grace window can fix; see docs/BACKEND_REQUESTS.md 1.)
  await page.goto('/account/orders')
  await expect(page.locator('.order')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.order')).toHaveCount(1)
  await page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: /Wishlist/ }).click()
  await expect(page.getByRole('link', { name: 'Ramen cat kids bottle, 500 ml' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: /Addresses/ }).click()
  await expect(page.locator('.addr')).toContainText('House 7, Sector 4')

  // Cancel it from the order page.
  await page.goto('/account/orders')
  await page.getByRole('link', { name: 'Track or cancel' }).click()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await page.getByRole('button', { name: 'Yes, cancel this order' }).click()
  await expect(page.locator('.pill').first()).toHaveText('Cancelled')
})

test('two tabs opened together both stay signed in', async ({ browser }) => {
  test.skip(!LOG, 'Set E2E_APP_LOG to the backend log file to read the development SMS code')
  const context = await browser.newContext()
  const first = await context.newPage()
  const phone = freshPhone()
  await first.goto('/sign-in')
  await first.getByLabel('Mobile number').fill(phone)
  await first.getByRole('button', { name: 'Send code' }).click()
  await expect.poll(() => otpFromLog(LOG!, phone)).not.toBeNull()
  await first.getByLabel('6-digit code').fill(otpFromLog(LOG!, phone)!)
  await first.waitForURL('**/account')

  // Like middle-clicking two products: both tabs restore the session from the same stored refresh token at once.
  const [a, b] = [await context.newPage(), await context.newPage()]
  await Promise.all([a.goto('/account/orders'), b.goto('/account/wishlist')])
  await expect(a.getByRole('heading', { name: 'My orders' })).toBeVisible()
  await expect(b.getByRole('heading', { name: 'Wishlist' })).toBeVisible()
  await b.reload()
  await expect(b.getByRole('heading', { name: 'Wishlist' })).toBeVisible()
  await context.close()
})
