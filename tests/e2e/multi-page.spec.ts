import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

function getPages() {
  return page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    return store.graph.getPages().map((p) => ({ id: p.id, name: p.name }))
  })
}

function getCurrentPageId() {
  return page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.currentPageId)
}

function getPageChildCount() {
  return page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    return store.graph.getChildren(store.state.currentPageId).length
  })
}

test('initial state has one page', async () => {
  const pages = await getPages()
  expect(pages).toHaveLength(1)
  expect(pages[0].name).toBe('Page 1')
})

// Pages panel UI (pages-panel, pages-item, pages-add) does not exist in current layout.
// Test page management via store API only.

test('add page via store creates a second page', async () => {
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    store.addPage()
  })
  await canvas.waitForRender()

  const pages = await getPages()
  expect(pages).toHaveLength(2)
})

test('new page is auto-selected', async () => {
  const pages = await getPages()
  const currentId = await getCurrentPageId()
  expect(currentId).toBe(pages[1].id)
})

test('new page is empty', async () => {
  expect(await getPageChildCount()).toBe(0)
})

test('drawing on new page adds nodes only to it', async () => {
  await canvas.drawRect(100, 100, 80, 60)
  await canvas.waitForRender()
  expect(await getPageChildCount()).toBe(1)
})

test('switching to first page via store', async () => {
  const pages = await getPages()
  await page.evaluate((pageId) => {
    window.__OPEN_PENCIL_STORE__!.switchPage(pageId)
  }, pages[0].id)
  await canvas.waitForRender()

  const currentId = await getCurrentPageId()
  expect(currentId).toBe(pages[0].id)
})

test('first page has no shapes', async () => {
  expect(await getPageChildCount()).toBe(0)
})

test('switching back to second page shows its shape', async () => {
  const pages = await getPages()
  await page.evaluate((pageId) => {
    window.__OPEN_PENCIL_STORE__!.switchPage(pageId)
  }, pages[1].id)
  await canvas.waitForRender()
  expect(await getPageChildCount()).toBe(1)
})

test('delete current page switches to adjacent', async () => {
  const pagesBefore = await getPages()
  const deletingId = await getCurrentPageId()

  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    store.deletePage(store.state.currentPageId)
  })
  await canvas.waitForRender()

  const pagesAfter = await getPages()
  expect(pagesAfter).toHaveLength(pagesBefore.length - 1)
  expect(pagesAfter.find((p) => p.id === deletingId)).toBeUndefined()

  const currentId = await getCurrentPageId()
  expect(pagesAfter.some((p) => p.id === currentId)).toBe(true)
})

test('rename page via store', async () => {
  const currentId = await getCurrentPageId()

  await page.evaluate(
    ([id, name]) => {
      window.__OPEN_PENCIL_STORE__!.renamePage(id, name)
    },
    [currentId, 'Renamed Page'] as [string, string]
  )
  await canvas.waitForRender()

  const updated = await getPages()
  const renamed = updated.find((p) => p.id === currentId)
  expect(renamed!.name).toBe('Renamed Page')
  canvas.assertNoErrors()
})

test('cannot delete the last page', async () => {
  let pages = await getPages()
  while (pages.length > 1) {
    await page.evaluate(() => {
      const store = window.__OPEN_PENCIL_STORE__!
      store.deletePage(store.state.currentPageId)
    })
    await canvas.waitForRender()
    pages = await getPages()
  }

  expect(pages).toHaveLength(1)

  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    store.deletePage(store.state.currentPageId)
  })
  await canvas.waitForRender()

  const after = await getPages()
  expect(after).toHaveLength(1)
  canvas.assertNoErrors()
})
