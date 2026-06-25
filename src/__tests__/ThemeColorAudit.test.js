import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');
const ALLOWED_HEX_FILES = new Set([
  path.join('theme', 'profileThemes.js'),
  path.join('theme', 'semanticTokens.js'),
  'index.css',
]);
const ALLOWED_PROMPT_PROFILE_CACHE_FILES = new Set([
  path.join('theme', 'profileThemeUtils.js'),
]);

const EXTENSIONS = new Set(['.js', '.jsx', '.css']);
const HEX_COLOR_RE = /#[0-9A-Fa-f]{3,8}\b/g;
const DIRECT_TAILWIND_COLOR_RE =
  /\b(?:bg|text|border|ring|from|to|via|accent|decoration|divide)-(?:red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g;
const PROMPT_PROFILE_LOCAL_STORAGE_RE =
  /(?:window\.)?localStorage\.(?:getItem|setItem|removeItem)\(['"]prompt_profile['"]\)/g;

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function relativeToSrc(filePath) {
  return path.relative(SRC_DIR, filePath).split(path.sep).join('/');
}

describe('theme color audit', () => {
  test('keeps component colors routed through semantic or profile tokens', () => {
    const violations = [];

    for (const filePath of listSourceFiles(SRC_DIR)) {
      const relativePath = relativeToSrc(filePath);
      const source = fs.readFileSync(filePath, 'utf8');

      if (!ALLOWED_HEX_FILES.has(relativePath)) {
        for (const match of source.matchAll(HEX_COLOR_RE)) {
          violations.push(`${relativePath}: hardcoded hex ${match[0]}`);
        }
      }

      if (relativePath !== 'index.css') {
        for (const match of source.matchAll(DIRECT_TAILWIND_COLOR_RE)) {
          violations.push(`${relativePath}: direct Tailwind color ${match[0]}`);
        }
      }

      if (
        !relativePath.startsWith('__tests__/') &&
        !ALLOWED_PROMPT_PROFILE_CACHE_FILES.has(relativePath)
      ) {
        for (const match of source.matchAll(PROMPT_PROFILE_LOCAL_STORAGE_RE)) {
          violations.push(`${relativePath}: direct prompt_profile cache access ${match[0]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
