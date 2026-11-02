import { expect, test } from '@playwright/test'
import { fillDelivery, freshPhone, orderNumberOnPage } from './helpers.ts'

test('browse, spin, add to cart, check out with cash and track as a guest', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Akihabara, delivered to your door.')

  // Category, then the product page with its 360 viewer.
  await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: 'Bottles' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Bottles' })).toBeVisible()
  await page.getByRole('link', { name: 'Sakura steel bottle, 750 ml' }).first().click()
  const viewer = page.getByRole('slider', { name: /360 degree view of Sakura/ })
  await expect(viewer).toBeVisible()
  await viewer.focus()
  const before = Number(await viewer.getAttribute('aria-valuenow'))
  await page.keyboard.press('ArrowLeft')
  await expect(viewer).not.toHaveAttribute('aria-valuenow', String(before))

  // Choose a colour and add two.
  await page.getByRole('button', { name: 'Night navy' }).click()
  await expect(page.locator('.opt-head .chosen')).toHaveText('Night navy')
  await page.getByRole('group', { name: 'Quantity' }).getByRole('button', { name: 'One more' }).click()
  await page.getByRole('button', { name: /Add to cart/ }).first().click()
  await expect(page.locator('.toast')).toContainText('Added to cart')
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible()

  // Cart: the server's quote (2 × ৳ 1,450 is under the ৳ 3,000 free-delivery line).
  await page.getByRole('link', { name: 'Cart, 2 items' }).click()
  const summary = page.getByRole('complementary', { name: 'Order summary' })
  await expect(summary).toContainText('৳ 2,900')
  await expect(summary).toContainText('more for free delivery')
  await summary.getByRole('link', { name: 'Go to checkout' }).click()

  // Checkout outside Dhaka changes the delivery fee.
  const phone = freshPhone()
  await fillDelivery(page, { name: 'E2E Guest', phone, district: 'Gazipur', area: 'Tongi', address: 'House 4, Road 2' })
  await expect(page.getByText('Delivery to Gazipur')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Place order, ৳ 3,030' })).toBeVisible()
  await page.getByRole('button', { name: 'Place order, ৳ 3,030' }).click()

  await expect(page.getByRole('heading', { name: 'Order placed. Thank you, E2E.' })).toBeVisible()
  await expect(page.getByText('Have ৳ 3,030 ready.')).toBeVisible()
  const orderNumber = await orderNumberOnPage(page)
  await expect(page.getByRole('link', { name: /Cart, 0 items/ })).toBeVisible()

  // Track it with the number and phone.
  await page.getByRole('link', { name: 'Track this order' }).click()
  await expect(page.getByLabel('Order number')).toHaveValue(orderNumber)
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByRole('button', { name: 'Track order' }).click()
  await expect(page.locator('.order .pill')).toHaveText('Placed')
  await expect(page.getByText(/Sakura steel bottle, 750 ml, Colour: Night navy ×2/)).toBeVisible()
})

test('search marks the match and filters keep to the URL', async ({ page }) => {
  await page.goto('/search')
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible()
  await page.getByRole('main').getByRole('searchbox', { name: 'Search products' }).fill('wig')
  await expect(page).toHaveURL(/q=wig/)
  await expect(page.getByText(/result.? for “wig”/)).toBeVisible()
  await expect(page.locator('mark').first()).toHaveText(/wig/i)

  await page.goto('/shop')
  const inStock = page.getByRole('checkbox', { name: 'In stock only' })
  await inStock.click()
  await expect(inStock).toBeChecked()
  await expect(page).toHaveURL(/inStock=1/)
  await page.getByLabel('Sort by').selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  const prices = await page.locator('.card .price').allInnerTexts()
  const values = prices.map((p) => Number(p.replace(/\D/g, '')))
  expect(values).toEqual([...values].sort((a, b) => a - b))
})

test('an online payment goes to the provider and back to the result page', async ({ page }) => {
  await page.goto('/p/canvas-tote')
  await page.getByRole('button', { name: /Add to cart/ }).first().click()
  await page.goto('/checkout')
  await expect(page.getByRole('radio', { name: /Cash on delivery/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Place order, ৳/ })).toBeVisible()
  const bkash = page.getByRole('radio', { name: /bKash/ })
  test.skip((await bkash.count()) === 0, 'bKash is not enabled on this backend (development enables it on the fake provider)')
  await fillDelivery(page, { name: 'E2E Online', phone: freshPhone(), area: 'Dhanmondi', address: 'House 12, Road 5' })
  await bkash.check()
  await page.getByRole('button', { name: /Place order/ }).click()
  await page.waitForURL(/\/checkout\/result\?order=SS-/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Payment received|confirming your payment/)
})
