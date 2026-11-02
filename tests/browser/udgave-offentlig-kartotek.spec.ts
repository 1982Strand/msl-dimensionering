import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function javascriptFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await javascriptFiles(path)));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

test('offentlig udgave: alle JS-filer hentes uden medarbejdernavne og -mails', async ({
  request,
}) => {
  const employees = JSON.parse(
    await readFile('tests/fixtures/medarbejdere-syntetisk.json', 'utf8'),
  ) as { navn: string; mail: string }[];
  const files = await javascriptFiles('dist-offentlig');
  expect(files.length).toBeGreaterThan(0);
  const sources = await Promise.all(
    files.map(async (file) => {
      const response = await request.get(
        '/' + file.slice('dist-offentlig'.length + 1).replaceAll('\\', '/'),
      );
      expect(response.ok(), file).toBeTruthy();
      return response.text();
    }),
  );
  for (const person of employees) {
    for (const value of [person.navn, person.mail])
      expect(sources.some((source) => source.includes(value))).toBe(false);
  }
});
