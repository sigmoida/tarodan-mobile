import { panLimitX, zoomImageSide } from '../ZoomableImage';

describe('zoomImageSide', () => {
  it('phones in portrait: the page width (unchanged)', () => {
    expect(zoomImageSide(390, 700)).toBe(390);
  });

  it('landscape tablet / short page: limited by the page height so the photo is not cropped', () => {
    expect(zoomImageSide(1280, 720)).toBe(720);
  });

  it('never negative', () => {
    expect(zoomImageSide(0, -5)).toBe(0);
  });
});

describe('panLimitX', () => {
  it('phones (square = page width): the old side * (scale - 1) / 2', () => {
    expect(panLimitX(390, 2.5, 390)).toBe((390 * 1.5) / 2);
  });

  it('landscape (square narrower than the page): stops at the photo edge', () => {
    expect(panLimitX(800, 2.5, 1366)).toBe((2000 - 1366) / 2);
    expect(panLimitX(800, 1.5, 1366)).toBe(0);
  });
});
