const { retry } = require('../retry')

const createFlakeyCommand = (opts = {}) => {
  const {
    failTimes = 1,
    success,
    error,
    errors
  } = opts
  let invocationCount = 0
  const command = jest.fn(() => {
    invocationCount += 1
    if (invocationCount > failTimes) {
      return Promise.resolve(success)
    }
    if (Array.isArray(errors)) {
      const err = errors[invocationCount - 1]
      return Promise.reject(err)
    }
    return Promise.reject(error)
  })
  return command
}

test('retry resolves with result', () => {
  const expected = 'apistuff'
  const commandMock = jest.fn(() => Promise.resolve(expected))
  return retry(commandMock).then(r => {
    expect(commandMock).toHaveBeenCalledTimes(1)
    expect(r).toEqual(expected)
  })
})

test('retry rejects with the error after retryLimit reached', () => {
  const error = new Error('Too much failure')
  const commandMock = createFlakeyCommand({ failTimes: 4, error })
  const retryTimes = 3
  const resultP = retry(commandMock, retryTimes)
  expect.assertions(2)
  return resultP.catch(actualError => {
    expect(commandMock).toHaveBeenCalledTimes(retryTimes + 1)
    expect(actualError).toBe(error)
  })
})

test('retry rejects if the predicate function fails', () => {
  const error = new Error('Too much failure')
  const commandMock = createFlakeyCommand({ failTimes: 4, error })
  const retryTimes = 3
  const resultP = retry(commandMock, retryTimes, () => false)
  expect.assertions(2)
  return resultP.catch(actualError => {
    expect(commandMock).toHaveBeenCalledTimes(1)
    expect(actualError).toBe(error)
  })
})
