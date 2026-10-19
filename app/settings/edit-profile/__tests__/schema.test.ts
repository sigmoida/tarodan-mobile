import { schemaT } from '@/test-utils';
import { buildProfileSchema } from '../_lib/schema';

const profileSchema = buildProfileSchema(schemaT, false);

const base = { displayName: 'Test User' };

describe('profile schema birth date', () => {
  it('accepts a pre-1970 birth date', () => {
    expect(profileSchema.safeParse({ ...base, birthDate: '1950-03-07' }).success).toBe(true);
  });

  it('still rejects under-18', () => {
    expect(profileSchema.safeParse({ ...base, birthDate: '2020-01-01' }).success).toBe(false);
  });

  it('accepts an empty birth date', () => {
    expect(profileSchema.safeParse({ ...base, birthDate: '' }).success).toBe(true);
  });
});
