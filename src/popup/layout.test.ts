// @ts-expect-error Node's built-in module types are supplied by Vitest at runtime.
import { readFileSync } from 'node:fs';

const stylesheet = readFileSync(new URL('./popup.css', import.meta.url), 'utf8');

describe('popup layout guardrails', () => {
  it('pins the popup document to a stable 380px width', () => {
    expect(stylesheet).toMatch(/html\s*\{[^}]*width:\s*380px[^}]*min-width:\s*380px/s);
    expect(stylesheet).toMatch(/body\s*\{[^}]*width:\s*100%[^}]*overflow-x:\s*hidden/s);
  });

  it('does not globally allow arbitrary word breaking', () => {
    expect(stylesheet).not.toMatch(/\.popup-shell\s*\{[^}]*overflow-wrap:\s*anywhere/s);
    expect(stylesheet).not.toContain('word-break:break-all');
  });

  it('keeps the toggle and header controls from shrinking', () => {
    expect(stylesheet).toMatch(/\.switch\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(stylesheet).toMatch(/\.icon-button\s*\{[^}]*flex:\s*0 0 auto/s);
  });

  it('honors collapsed advanced settings even when the section is a grid', () => {
    expect(stylesheet).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/s);
  });
});
