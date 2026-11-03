import { expect, test } from '@playwright/test'
import { enterCode, freshPhone, otpFromLog } from './helpers.ts'

const LOG = process.env.E2E_APP_LOG

test('sign in with a texted code, keep the guest bag and hearts, and see the order in the account', async ({ page }) => {
  test.skip(!LOG, 'Set E2E_APP_LOG to the backend log file to read the development SMS code')

  // As a guest: one item in the bag and one heart.
  await page.goto('/p/sakura-shaker')
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('dialog', { name: /Your bag/ })).toContainText('1 item')
  await page.goto('/shop/bottles')
  await page.getByRole('button', { name: 'Save Ramen Cat kids bottle, 500 ml to wishlist' }).click()

  const phone = freshPhone()
  await page.goto('/sign-in?back=/checkout')
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByRole('group', { name: '6-digit code' })).toBeVisible()
  await expect.poll(() => otpFromLog(LOG!, phone)).not.toBeNull()
  await enterCode(page, otpFromLog(LOG!, phone)!)

  // Back at checkout, signed in, with the merged bag and the phone filled in.
  await page.waitForURL('**/checkout')
  await expect(page.locator('.co-title').getByText(/Signed in as/)).toBeVisible()
  await expect(page.getByLabel('Mobile number')).toHaveValue(phone)
  await expect(page.getByRole('complementary', { name: 'Order summary' })).toContainText('Sakura tritan shaker')
  await page.getByLabel('Full name').fill('E2E Member')
  await page.getByLabel('Area or thana').fill('Uttara')
  await page.getByLabel('House, road and flat').fill('House 7, Sector 4')
  await page.getByRole('button', { name: /Place order ·/ }).click()
  await expect(page.getByRole('heading', { name: 'Order placed. Thank you, E2E.' })).toBeVisible()

  // The account opens on the order; the heart and the saved address are there; the session survives a reload.
  // (Wait for the load's own session restore first: see docs/BACKEND_REQUESTS.md 1.)
  await page.goto('/account')
  await expect(page.locator('.ocard')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.ocard')).toHaveCount(1)
  await page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: /Wishlist/ }).click()
  await expect(page.getByRole('link', { name: 'Ramen Cat kids bottle, 500 ml' }).first()).toBeVisible()
  await page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: /Addresses/ }).click()
  await expect(page.locator('.acct-addr')).toContainText('House 7, Sector 4')

  // Cancel it from the order page.
  await page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: /Orders/ }).click()
  await page.getByRole('link', { name: 'Cancel order' }).click()
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await page.getByRole('button', { name: 'Yes, cancel this order' }).click()
  await expect(page.locator('.tag').first()).toHaveText('Cancelled')
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
  await enterCode(first, otpFromLog(LOG!, phone)!)
  await first.waitForURL('**/account')

  // Like middle-clicking two products: both tabs restore the session from the same stored refresh token at once.
  const [a, b] = [await context.newPage(), await context.newPage()]
  await Promise.all([a.goto('/account'), b.goto('/account/wishlist')])
  await expect(a.getByRole('heading', { name: 'My orders' })).toBeVisible()
  await expect(b.getByRole('heading', { name: 'Wishlist' })).toBeVisible()
  await b.reload()
  await expect(b.getByRole('heading', { name: 'Wishlist' })).toBeVisible()
  await context.close()
})
