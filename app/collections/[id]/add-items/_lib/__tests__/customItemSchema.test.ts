/**
 * Custom collection item schema: the same limits as the API DTO and web `customItemSchema`
 * (title 1..200 trimmed, description <= 1000, year empty or digits 1900..2100) with localized messages.
 */
import i18n from '@/i18n/config';
import { buildCustomItemSchema, CUSTOM_ITEM_LIMITS, EMPTY_CUSTOM_ITEM, toCustomItemBody } from '../customItemSchema';

const schema = buildCustomItemSchema(i18n.t.bind(i18n));

const errors = (input: Record<string, unknown>) => {
  const result = schema.safeParse({ ...EMPTY_CUSTOM_ITEM, title: 'Model', ...input });
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('custom item schema', () => {
  it('only the title is required, and it is trimmed', () => {
    expect(errors({ title: '' })).toEqual(['title: Bu alan zorunludur']);
    expect(errors({ title: '   ' })).toEqual(['title: Bu alan zorunludur']);
    const parsed = schema.parse({ ...EMPTY_CUSTOM_ITEM, title: '  Ferrari F40  ' });
    expect(parsed.title).toBe('Ferrari F40');
  });

  it('title is limited to 200 characters and description to 1000', () => {
    expect(errors({ title: 'a'.repeat(CUSTOM_ITEM_LIMITS.titleMax) })).toEqual([]);
    expect(errors({ title: 'a'.repeat(CUSTOM_ITEM_LIMITS.titleMax + 1) })).toEqual(['title: En fazla 200 karakter olabilir']);
    expect(errors({ description: 'a'.repeat(CUSTOM_ITEM_LIMITS.descriptionMax) })).toEqual([]);
    expect(errors({ description: 'a'.repeat(CUSTOM_ITEM_LIMITS.descriptionMax + 1) })).toEqual([
      'description: En fazla 1000 karakter olabilir',
    ]);
  });

  it('year is empty or a whole year from 1900 to 2100, digits only', () => {
    expect(errors({ year: '' })).toEqual([]);
    expect(errors({ year: '1900' })).toEqual([]);
    expect(errors({ year: '2100' })).toEqual([]);
    expect(errors({ year: '1899' })).toEqual(['year: En az 1900 olmalıdır']);
    expect(errors({ year: '2101' })).toEqual(['year: En fazla 2100 olabilir']);
    // `Number()` would accept these three; the digits-only rule rejects them.
    for (const year of ['1967.', '1e3', '0x7B2', '19 67', '-1967']) {
      expect(errors({ year })).toEqual(['year: Geçerli bir değer girin']);
    }
  });
});

describe('toCustomItemBody', () => {
  const values = (over = {}) => schema.parse({ ...EMPTY_CUSTOM_ITEM, title: 'Ferrari F40', ...over });

  it('maps the form to the API body: year as a number, blanks left off, the uploaded image URL', () => {
    const body = toCustomItemBody(
      values({ description: 'Kırmızı', brand: 'Ferrari', model: 'F40', year: '1987', scale: '1:18', manufacturer: ' BBR ', material: 'diecast' }),
      'https://cdn.example.test/collections/a.jpg',
    );
    expect(body).toEqual({
      customTitle: 'Ferrari F40',
      customDescription: 'Kırmızı',
      customBrand: 'Ferrari',
      customModel: 'F40',
      customYear: 1987,
      customScale: '1:18',
      customManufacturer: 'BBR',
      customMaterial: 'diecast',
      customImageUrl: 'https://cdn.example.test/collections/a.jpg',
    });
  });

  it('a title-only item sends only the title', () => {
    expect(toCustomItemBody(values())).toEqual({ customTitle: 'Ferrari F40' });
  });
});
