import { isClientError, retryUnlessClientError } from '../retry';

/**
 * retryUnlessClientError: the cart and checkout share the SAME quote key; if the predicate were
 * copied into two hooks, the same query would send a different number of requests on two
 * screens (finding N3). The single source is here, and `isClientError` is its 4xx test.
 */
describe('retryUnlessClientError', () => {
  it('does NOT retry a 4xx (a coupon 400 used to show the warning three times)', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 499]) {
      expect(retryUnlessClientError(0, { response: { status } })).toBe(false);
    }
  });

  it('retries 5xx and network errors twice, like the default', () => {
    const serverError = { response: { status: 500 } };
    expect(retryUnlessClientError(0, serverError)).toBe(true);
    expect(retryUnlessClientError(1, serverError)).toBe(true);
    expect(retryUnlessClientError(2, serverError)).toBe(false);

    // No response (connection lost): no status.
    expect(retryUnlessClientError(0, new Error('Network Error'))).toBe(true);
    expect(retryUnlessClientError(2, new Error('Network Error'))).toBe(false);
  });

  it('a status that is not a number is not a client error (no false short circuit)', () => {
    expect(retryUnlessClientError(0, { response: { status: '400' } })).toBe(true);
    expect(retryUnlessClientError(0, null)).toBe(true);
    expect(retryUnlessClientError(0, undefined)).toBe(true);
  });
});

describe('isClientError', () => {
  it('is true for a numeric 4xx status only', () => {
    for (const status of [400, 403, 404, 499]) expect(isClientError({ response: { status } })).toBe(true);
    for (const status of [399, 500, 503]) expect(isClientError({ response: { status } })).toBe(false);
    expect(isClientError({ response: { status: '404' } })).toBe(false);
    expect(isClientError(new Error('Network Error'))).toBe(false);
    expect(isClientError(null)).toBe(false);
    expect(isClientError(undefined)).toBe(false);
  });
});
