/**
 * Single-image uploads to `POST /media/upload?folder=<folder>` (field `file`): messages, refund
 * evidence and, like web `uploadCollectionImage`, a custom collection item's picture.
 */
jest.mock('../client', () => ({
  api: { post: jest.fn(() => Promise.resolve({ data: { url: 'https://cdn.example.test/x.jpg' } })) },
}));

import { api } from '../client';
import { mediaApi, MEDIA_UPLOAD_TIMEOUT_MS } from '../media';

const mockPost = api.post as jest.Mock;
const file = { uri: 'file:///tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg' };

beforeEach(() => jest.clearAllMocks());

it.each([
  ['uploadCollectionImage', 'collections'],
  ['uploadMessageImage', 'messages'],
  ['uploadRefundEvidence', 'reviews'],
] as const)('%s posts the file to /media/upload with folder=%s', async (method, folder) => {
  const res = await mediaApi[method](file);
  expect(res.data.url).toBe('https://cdn.example.test/x.jpg');
  expect(mockPost).toHaveBeenCalledTimes(1);
  const [url, body, config] = mockPost.mock.calls[0]!;
  expect(url).toBe('/media/upload');
  expect(body).toBeInstanceOf(FormData);
  expect(config.params).toEqual({ folder });
  expect(config.timeout).toBe(MEDIA_UPLOAD_TIMEOUT_MS);
  expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
});
