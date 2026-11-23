// Light, dark or system (the default), as in crabphp/design: data-theme on <html>
// sets color-scheme, and every color token in crab.css is light-dark(light, dark).
// The choice uses the design showcase's storage key, so /design/ follows it too.
// Without JavaScript the page follows the system and the switch stays hidden.
const script = `(() => {
  const root = document.documentElement;
  const colors = { light: '#fbfbf9', dark: '#111111' };
  const apply = (choice) => {
    root.dataset.theme = choice;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = colors[choice] ?? colors[meta.media.includes('light') ? 'light' : 'dark'];
    for (const button of document.querySelectorAll('[data-theme-choice]')) button.setAttribute('aria-pressed', String(button.dataset.themeChoice === choice));
  };
  let saved;
  try { saved = localStorage.getItem('crab-theme'); } catch {}
  apply(saved in colors ? saved : 'auto');
  addEventListener('DOMContentLoaded', () => {
    const themes = document.querySelector('.theme-switch');
    if (!themes) return;
    apply(root.dataset.theme);
    themes.hidden = false;
    themes.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-theme-choice]')?.dataset.themeChoice;
      if (!choice) return;
      apply(choice);
      try { localStorage.setItem('crab-theme', choice); } catch {}
    });
  });
})();`;

export const themeMeta = `<meta name="theme-color" content="#fbfbf9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)">`;
export const themeScript = `<script>${script.replace(/\n\s*/g, ' ')}</script>`;
export const themeSwitch = `<p class="theme-switch" role="group" aria-label="Theme" hidden>Theme <button type="button" data-theme-choice="auto" aria-pressed="true">System</button> <button type="button" data-theme-choice="light" aria-pressed="false">Light</button> <button type="button" data-theme-choice="dark" aria-pressed="false">Dark</button></p>`;

// Landing pages: replace the single theme-color meta, add the script to the
// head (before first paint) and the switch to the end of the footer.
export const addTheme = (html) => html
  .replace(/<meta name="theme-color"[^>]*>/, themeMeta)
  .replace('</head>', `  ${themeScript}\n</head>`)
  .replace('</footer>', `  ${themeSwitch}\n    </footer>`);
