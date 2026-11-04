import { expect, test } from '@playwright/test'
import { fillDelivery, freshPhone, orderNumberOnPage } from './helpers.ts'

// Desktop width (Playwright's default 1280 × 720); the phone layout is covered by the unit tests and screenshots.

test('browse, spin, add to the bag, check out with cash and track as a guest', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Carry your character.')

  // Category from the header, then the product page with its 360.
  await page.getByRole('navigation', { name: 'Shop' }).getByRole('link', { name: 'Bottles' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Bottles/ })).toBeVisible()
  await page.getByRole('link', { name: 'Kitsune Night steel bottle, 750 ml' }).first().click()
  await expect(page.getByText('Kitsune · Bottles')).toBeVisible()
  const spin = page.getByRole('slider', { name: /360 degree view of Kitsune Night/ })
  await spin.focus()
  const before = await spin.getAttribute('aria-valuenow')
  await page.keyboard.press('ArrowLeft')
  await expect(spin).not.toHaveAttribute('aria-valuenow', before ?? '')

  // A colour, two of them, into the bag: the drawer opens with the server's quote.
  await page.getByRole('group', { name: 'Colour' }).getByRole('button', { name: 'Night navy' }).click()
  await page.getByRole('group', { name: 'Quantity' }).getByRole('button', { name: 'One more' }).click()
  await page.getByRole('button', { name: 'Add to bag' }).click()
  const bag = page.getByRole('dialog', { name: /Your bag/ })
  await expect(bag).toContainText('2 items')
  await expect(bag).toContainText('৳ 2,900')
  await expect(bag).toContainText('away from free delivery')
  await expect(page.getByRole('button', { name: 'Bag, 2 items' })).toBeAttached()
  await bag.getByRole('link', { name: /Checkout · ৳ 2,970/ }).click()

  // Focused checkout; outside Dhaka changes the fee.
  await expect(page.getByText('Secure checkout')).toBeVisible()
  const phone = freshPhone()
  await fillDelivery(page, { name: 'E2E Guest', phone, district: 'Gazipur', area: 'Tongi', address: 'House 4, Road 2' })
  await expect(page.getByRole('complementary', { name: 'Order summary' })).toContainText('Delivery to Gazipur')
  await page.getByRole('button', { name: 'Place order · ৳ 3,030' }).click()

  await expect(page.getByRole('heading', { name: 'Order placed. Thank you, E2E.' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Order details' })).toContainText('Have this ready')
  await expect(page.locator('.done-due').first()).toHaveText('৳ 3,030')
  const orderNumber = await orderNumberOnPage(page)
  await expect(page.getByRole('button', { name: 'Bag, 0 items' })).toBeAttached()

  // Track it with the number and phone.
  await page.getByRole('link', { name: 'Track order' }).click()
  await expect(page.getByLabel('Order number')).toHaveValue(orderNumber)
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByRole('button', { name: 'Track order' }).click()
  await expect(page.locator('.order .tag')).toHaveText('Placed')
  await expect(page.getByText(/Kitsune Night steel bottle, 750 ml, Colour: Night navy ×2/)).toBeVisible()
})

test('search suggests and marks the match; the filter bar keeps to the URL', async ({ page }) => {
  await page.goto('/search')
  await page.getByRole('searchbox', { name: 'Search products' }).fill('kits')
  await expect(page).toHaveURL(/q=kits/)
  await expect(page.getByRole('link', { name: /Kitsune collection/ })).toBeVisible()
  await expect(page.getByText(/products? for “kits”/)).toBeVisible()
  await expect(page.locator('mark').first()).toHaveText(/kits/i)

  await page.goto('/shop/bottles')
  await page.getByRole('button', { name: 'Material' }).click()
  await page.getByRole('checkbox', { name: /Steel/ }).click()
  await expect(page).toHaveURL(/tag=Material%3ASteel/)
  await page.getByRole('button', { name: /^Sort: / }).click()
  await page.getByRole('radio', { name: 'Price, low to high' }).click()
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(page.getByRole('button', { name: 'Sort: Price, low to high' })).toBeVisible()
  // The list re-sorts after the new query lands; poll instead of reading the cards once.
  await expect
    .poll(async () => {
      const prices = await page.locator('.pcard .pprice').allInnerTexts()
      const values = prices.map((p) => Number(p.split('৳').filter(Boolean)[0].replace(/\D/g, '')))
      return values.length > 0 && values.every((v, i) => i === 0 || values[i - 1] <= v)
    })
    .toBe(true)
})

test('an online payment goes to the provider and back to the result page', async ({ page }) => {
  await page.goto('/p/sakura-shaker')
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await page.getByRole('dialog', { name: /Your bag/ }).getByRole('link', { name: /Checkout ·/ }).click()
  await expect(page.getByRole('radio', { name: /Cash on delivery/ })).toBeAttached()
  await expect(page.getByRole('button', { name: /Place order · ৳/ })).toBeVisible()
  const bkash = page.getByRole('radio', { name: /bKash/ })
  test.skip((await bkash.count()) === 0, 'bKash is not enabled on this backend (development enables it on the fake provider)')
  await fillDelivery(page, { name: 'E2E Online', phone: freshPhone(), area: 'Dhanmondi', address: 'House 12, Road 5' })
  await page.getByText('bKash', { exact: true }).click()
  await expect(bkash).toBeChecked()
  await page.getByRole('button', { name: /Place order ·/ }).click()
  await page.waitForURL(/\/checkout\/result\?order=SS-/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Payment received|confirming your payment/)
})
