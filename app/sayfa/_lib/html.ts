import { theme } from '@/ui';

const { colors } = theme;

// API page.content bir HTML string'idir; düz <Text> ile basıldığında etiketler ham
// görünür. Bu yüzden WebView + htmlWrapper ile tasarım token'larına uygun render edilir.
/** CMS HTML gövdesini tasarım token'larına uygun belge olarak sarar (WebView kaynağı). */
export const htmlWrapper = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: ${colors.text.heading};
          font-size: 15px;
          line-height: 1.6;
          margin: 0;
          padding: 16px;
          background: ${colors.surface.DEFAULT};
        }
        h1, h2, h3 { color: ${colors.text.heading}; margin-top: 20px; }
        h1 { font-size: 22px; }
        h2 { font-size: 18px; }
        h3 { font-size: 16px; }
        p { margin: 10px 0; }
        a { color: ${colors.primary[600]!}; text-decoration: none; }
        ul, ol { padding-left: 20px; }
        li { margin: 6px 0; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        hr { border: none; border-top: 1px solid ${colors.border.DEFAULT}; margin: 16px 0; }
        blockquote {
          margin: 16px 0;
          padding: 8px 16px;
          border-left: 3px solid ${colors.primary[600]!};
          background: ${colors.primary[50]!};
          border-radius: 4px;
          color: ${colors.text.heading};
        }
        code {
          background: ${colors.surface.alt};
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Menlo', 'Courier New', monospace;
          font-size: 13px;
        }
      </style>
    </head>
    <body>${content}</body>
  </html>
`;
