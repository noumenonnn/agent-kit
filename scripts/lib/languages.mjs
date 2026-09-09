import fs from 'node:fs';
import path from 'node:path';

export const LANGUAGES = ['en', 'ru'];
export function language(value = 'en') {
  if (!LANGUAGES.includes(value)) throw new Error('Language must be en or ru / Язык должен быть en или ru');
  return value;
}

export function resource(kit, relative, selected = 'en') {
  language(selected);
  const localized = selected === 'ru' && relative.endsWith('.md') ? path.join('locales/ru', relative) : relative;
  return fs.readFileSync(path.join(kit, localized));
}

export function translations(plan, kit, source, relative) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name), file = path.join(source, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source symlink refused: ${name}`);
    if (entry.isDirectory()) translations(plan, kit, file, name);
    else if (entry.isFile() && name.endsWith('.md')) for (const selected of LANGUAGES) {
      plan.add(`.agent/translations/${selected}/${name}`, resource(kit, name, selected));
    }
  }
}
