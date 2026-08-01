import { errorText } from '../errorText';

describe('errorText', () => {
  it('returns a string message as-is', () => {
    const e = { response: { data: { message: 'email must be an email' } } };
    expect(errorText(e, 'fallback')).toBe('email must be an email');
  });

  it('joins an array message line by line', () => {
    const e = {
      response: {
        data: { message: ['email must be an email', 'password too short'] },
      },
    };
    expect(errorText(e, 'fallback')).toBe(
      'email must be an email\npassword too short',
    );
  });

  it('falls back when there is no message', () => {
    expect(errorText(undefined, 'fallback')).toBe('fallback');
    expect(errorText({}, 'fallback')).toBe('fallback');
    expect(errorText({ response: {} }, 'fallback')).toBe('fallback');
  });

  it('falls back when message is an empty string (regression: ?? would keep "")', () => {
    const e = { response: { data: { message: '' } } };
    expect(errorText(e, 'fallback')).toBe('fallback');
  });

  it('falls back when message is an empty array', () => {
    const e = { response: { data: { message: [] } } };
    expect(errorText(e, 'fallback')).toBe('fallback');
  });
});
