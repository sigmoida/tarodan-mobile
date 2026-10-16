import { canPromptFor, requestWithRationale, toPermissionState, type PermissionAccessor } from '..';

describe('toPermissionState', () => {
  it.each([
    [{ status: 'granted', granted: true }, { status: 'granted', canAskAgain: false }],
    [{ status: 'undetermined', canAskAgain: true }, { status: 'undetermined', canAskAgain: true }],
    [{ status: 'denied', canAskAgain: true }, { status: 'denied', canAskAgain: true }],
    [{ status: 'denied', canAskAgain: false }, { status: 'denied', canAskAgain: false }],
    // iOS geçici (provisional) izin: bildirim teslim edilir → verilmiş sayılır.
    [{ status: 'denied', ios: { status: 3 } }, { status: 'granted', canAskAgain: false }],
  ])('%j → %j', (raw, expected) => {
    expect(toPermissionState(raw)).toEqual(expected);
  });

  it('yanıt yoksa unavailable', () => {
    expect(toPermissionState(null)).toEqual({ status: 'unavailable', canAskAgain: false });
  });
});

describe('requestWithRationale', () => {
  const accessor = (
    read: ReturnType<typeof toPermissionState>,
    afterRequest: ReturnType<typeof toPermissionState> = { status: 'granted', canAskAgain: false },
  ) => {
    const request = jest.fn(async () => afterRequest);
    const a: PermissionAccessor = { read: jest.fn(async () => read), request };
    return { a, request };
  };

  it('zaten verilmişse gerekçe gösterilmez', async () => {
    const { a, request } = accessor({ status: 'granted', canAskAgain: false });
    const rationale = jest.fn();
    await expect(requestWithRationale(a, rationale)).resolves.toBe('granted');
    expect(rationale).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('gerekçe reddedilirse sistem diyaloğu GÖSTERİLMEZ (tek hak harcanmaz)', async () => {
    const { a, request } = accessor({ status: 'undetermined', canAskAgain: true });
    await expect(requestWithRationale(a, async () => false)).resolves.toBe('dismissed');
    expect(request).not.toHaveBeenCalled();
  });

  it('gerekçe kabul → sistem diyaloğu → verildi', async () => {
    const { a, request } = accessor({ status: 'undetermined', canAskAgain: true });
    await expect(requestWithRationale(a, async () => true)).resolves.toBe('granted');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('sorulamaz (iOS reddi) → blocked, gerekçe/diyalog yok', async () => {
    const { a, request } = accessor({ status: 'denied', canAskAgain: false });
    const rationale = jest.fn();
    await expect(requestWithRationale(a, rationale)).resolves.toBe('blocked');
    expect(rationale).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('diyalogda red ve bir daha sorulamaz → blocked', async () => {
    const { a } = accessor({ status: 'undetermined', canAskAgain: true }, { status: 'denied', canAskAgain: false });
    await expect(requestWithRationale(a, async () => true)).resolves.toBe('blocked');
  });
});

it('canPromptFor: yalnız sorulabilen ve verilmemiş durum', () => {
  expect(canPromptFor({ status: 'undetermined', canAskAgain: true })).toBe(true);
  expect(canPromptFor({ status: 'denied', canAskAgain: true })).toBe(true);
  expect(canPromptFor({ status: 'denied', canAskAgain: false })).toBe(false);
  expect(canPromptFor({ status: 'granted', canAskAgain: false })).toBe(false);
  expect(canPromptFor({ status: 'unavailable', canAskAgain: false })).toBe(false);
});
