import { zoomImageSide } from '../ZoomableImage';

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
