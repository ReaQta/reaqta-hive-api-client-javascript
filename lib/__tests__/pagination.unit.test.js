const { collectPageResults } = require('../pagination')

test('collectPageResults returns a function that resolves to [] if not given a ReaQta response', () => {
  const collator = collectPageResults()
  return expect(collator()).resolves.toMatchObject({ data: [] })
})

test('collectPageResults returns a function that resolves to [] if not given a *paginatable* ReaQta response', () => {
  const collator = collectPageResults()
  const mockResponse = { data: ['high', 'five'] }
  return expect(collator(mockResponse)).resolves.toMatchObject({ data: [] })
})

test('collectPageResults returns a function that resolves to `data.result` if no more pages', () => {
  const collator = collectPageResults()
  const mockResponse = { data: { result: [1, 2, 3] } }
  return expect(collator(mockResponse)).resolves.toMatchObject({ data: [1, 2, 3] })
})

test('collectPageResults returns a function that collects `data.result` from multiple pages', () => {
  const collator = collectPageResults()
  const mockPage2 = { data: { result: [4, 5, 6], remainingItems: 0 } }
  const getNextPageMock = jest.fn(() => Promise.resolve(mockPage2))
  const mockPage1 = { data: { result: [1, 2, 3] }, getNextPage: getNextPageMock }
  return expect(collator(mockPage1)).resolves.toMatchObject({ data: [1, 2, 3, 4, 5, 6] })
})
