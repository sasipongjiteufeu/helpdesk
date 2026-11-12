import { detectedType, safeFileHeaders } from './upload-safety';

describe('attachment safety', () => {
  it('rejects HTML or SVG disguised as an image', () => {
    expect(detectedType(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png')).toBeNull();
    expect(detectedType(Buffer.from('<svg onload="alert(1)"></svg>'), 'image/svg+xml')).toBeNull();
  });
  it('detects image signatures independently of declared MIME', () => {
    expect(detectedType(Buffer.from([137,80,78,71,13,10,26,10]), 'text/html')).toBe('image/png');
    expect(detectedType(Buffer.from([255,216,255,224]), 'image/jpeg')).toBe('image/jpeg');
  });
  it('forces active or unknown legacy content to download with no-store and sandbox', () => {
    const res = { setHeader: jest.fn() };
    safeFileHeaders(res as any, 'text/html', 'legacy.html');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^attachment;/));
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining('sandbox'));
  });
});
