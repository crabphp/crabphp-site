// Google Tag Manager for the marketing pages (the home page and Bia's), added
// only by `vite build`: local development sends nothing. The docs, written
// to public/ by render-docs, are copied untouched and carry no tag.
export const GTM_ID = 'GTM-5LZJ6WX4';

export const analyticsSnippet = `<script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
  </script>`;

export function addAnalytics(html) {
  if (html.includes(`gtm.js?id=${GTM_ID}`) || !html.includes('</head>')) return html;
  return html.replace('</head>', `  ${analyticsSnippet}\n</head>`);
}
