import { expect, test, type APIRequestContext } from '@playwright/test'
import { freshPhone } from './helpers.ts'

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@senpai.local'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

/** A cash order placed straight through the API, so the admin test has its own order to move. */
async function placeOrder(request: APIRequestContext): Promise<string> {
  const list = await (await request.get('/api/products?inStock=true&pageSize=1')).json()
  const slug: string = list.payload.content[0].slug
  const product = (await (await request.get(`/api/products/${slug}`)).json()).payload
  const option = product.options.find((o: { stockState: string }) => o.stockState !== 'SOLD_OUT')
  const res = await request.post('/api/orders', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: {
      items: [{ productId: product.id, optionId: option?.id, quantity: 1 }],
      fullName: 'Admin Test', phone: freshPhone(), district: 'Dhaka', area: 'Dhanmondi', addressLine: 'House 1, Road 1',
      paymentMethod: 'COD',
    },
  })
  expect(res.status()).toBe(201)
  return (await res.json()).payload.orderNumber
}

test('staff sign in, see the dashboard and pack an order', async ({ page, request }) => {
  test.skip(!PASSWORD, 'Set E2E_ADMIN_PASSWORD to the admin password (after its first change).')
  const orderNumber = await placeOrder(request)

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/sign-in/)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.locator('.adm-tile').filter({ has: page.getByText('Orders', { exact: true }) })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What to act on' })).toBeVisible()

  await page.getByRole('link', { name: 'Products', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Edit stock of / }).first()).toBeVisible()

  await page.getByRole('link', { name: 'Orders', exact: true }).click()
  await page.getByLabel('Order number or phone').fill(orderNumber)
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('link', { name: orderNumber }).click()
  await page.getByLabel('Note for the history (optional)').fill('Packed by the e2e test')
  await page.getByRole('button', { name: 'Mark packed' }).click()
  await expect(page.getByRole('button', { name: 'Hand to rider' })).toBeVisible()
  await expect(page.getByText('Packed by the e2e test')).toBeVisible()
})

/** Regression: on a phone the admin grid grew to the product table's width and its Edit buttons fell off-screen. */
test('on a phone the product table scrolls in its panel and Edit opens the editor', async ({ page }) => {
  test.skip(!PASSWORD, 'Set E2E_ADMIN_PASSWORD to the admin password (after its first change).')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/sign-in?back=/admin/products')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  const main = page.locator('main.adm-main')
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  expect((await main.boundingBox())!.width).toBeLessThanOrEqual(390)
  await page.getByRole('link', { name: /^Edit / }).first().click()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible()
})

test('a product created with an uploaded photo shows it in the shop', async ({ page }) => {
  test.skip(!PASSWORD, 'Set E2E_ADMIN_PASSWORD to the admin password (after its first change).')
  const name = `E2E bottle ${Date.now()}`
  await page.goto('/admin/sign-in?back=/admin/products/new')
  await page.getByLabel('Email', { exact: true }).fill(EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Category', { exact: true }).selectOption({ index: 1 })
  await page.getByLabel('Status', { exact: true }).selectOption('ACTIVE')
  await page.getByLabel('Summary', { exact: true }).fill('A bottle made by the end-to-end test.')
  await page.getByLabel('Price (৳)', { exact: true }).fill('990')
  await page.getByLabel('Stock', { exact: true }).fill('3')
  const photos = page.getByRole('group', { name: 'Photos' })
  await photos.locator('input[type=file]').setInputFiles('e2e/fixtures/photo.png')
  await expect(photos.locator('img')).toHaveCount(1)
  await photos.getByLabel(/Alt text/).fill('The test bottle')
  await page.getByRole('button', { name: 'Create product' }).click()
  await expect(page).toHaveURL(/\/admin\/products\/\d+$/)
  const slug = await page.getByLabel('Address name (slug)', { exact: true }).inputValue()

  await page.goto(`/p/${slug}`)
  const img = page.locator('img[src*="/uploads/"]').first()
  await expect(img).toBeVisible()
  // the e2e type-check has no DOM types; these are the two image fields we read
  const loaded = await img.evaluate((el) => {
    const image = el as unknown as { complete: boolean; naturalWidth: number }
    return image.complete && image.naturalWidth > 0
  })
  expect(loaded).toBe(true)
})
