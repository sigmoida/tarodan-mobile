/** B-2.3 · Zorunlu adım sırası (web `lib/requiredSteps.ts` ile aynı kurallar). */
import { activeRequiredStep, requiredStepState } from '../requiredSteps';

describe('requiredSteps', () => {
  it('sorgu kapalıysa (misafir) adım tamam sayılır', () => {
    expect(requiredStepState({ enabled: false, isPending: true, needed: true })).toBe('done');
  });

  it('ilk veri gelmeden durum bilinmez; gelince gerekene göre pending/done', () => {
    expect(requiredStepState({ enabled: true, isPending: true, needed: false })).toBe('unknown');
    expect(requiredStepState({ enabled: true, isPending: false, needed: true })).toBe('pending');
    expect(requiredStepState({ enabled: true, isPending: false, needed: false })).toBe('done');
  });

  it('aktif adım: ilk pending; unknown iken hiçbir şey gösterilmez', () => {
    expect(activeRequiredStep({ consents: 'pending', legalIdentity: 'done' })).toBe('consents');
    expect(activeRequiredStep({ consents: 'unknown', legalIdentity: 'done' })).toBeNull();
    expect(activeRequiredStep({ consents: 'done', legalIdentity: 'done' })).toBeNull();
  });

  it('B-2.4 · sıra: önce onaylar, sonra kimlik; onay durumu bilinmeden kimlik açılmaz', () => {
    expect(activeRequiredStep({ consents: 'pending', legalIdentity: 'pending' })).toBe('consents');
    expect(activeRequiredStep({ consents: 'done', legalIdentity: 'pending' })).toBe('legalIdentity');
    expect(activeRequiredStep({ consents: 'unknown', legalIdentity: 'pending' })).toBeNull();
    expect(activeRequiredStep({ consents: 'done', legalIdentity: 'unknown' })).toBeNull();
  });
});
