/**
 * Collection item requests: a listing, a custom item (own title and fields, the uploaded image URL)
 * and the brand's models (web `GET /car-models?brand=<slug>`).
 */
jest.mock('../client', () => ({
  api: { get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(() => Promise.resolve({ data: {} })) },
  guestApi: {},
}));

import { api } from '../client';
import { carModelsApi } from '../products';
import { collectionsApi } from '../catalog';

beforeEach(() => jest.clearAllMocks());

it('adds a listing and a custom item to POST /collections/:id/items as given', async () => {
  await collectionsApi.addItem('c1', { productId: 'p1' });
  await collectionsApi.addItem('c1', {
    customTitle: 'Ferrari F40',
    customYear: 1987,
    customImageUrl: 'https://cdn.example.test/collections/u/a.jpg',
  });
  expect(api.post).toHaveBeenNthCalledWith(1, '/collections/c1/items', { productId: 'p1' });
  expect(api.post).toHaveBeenNthCalledWith(2, '/collections/c1/items', {
    customTitle: 'Ferrari F40',
    customYear: 1987,
    customImageUrl: 'https://cdn.example.test/collections/u/a.jpg',
  });
});

it('asks for the models of a brand by its slug', async () => {
  await carModelsApi.findByBrand('ferrari');
  expect(api.get).toHaveBeenCalledWith('/car-models', { params: { brand: 'ferrari' } });
});
