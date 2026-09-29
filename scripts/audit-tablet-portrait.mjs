import fs from 'node:fs';
import path from 'node:path';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

const screenFiles = walk('src/screens')
  .filter(file => file.endsWith('Screen.tsx'))
  .map(file => file.replaceAll('\\', '/'));
const sources = new Map(
  screenFiles.map(file => [file, fs.readFileSync(file, 'utf8')]),
);
const appSource = fs.readFileSync('App.tsx', 'utf8');
const uiSource = fs.readFileSync('src/screens/ui.tsx', 'utf8');
const manifestSource = fs.readFileSync(
  'android/app/src/main/AndroidManifest.xml',
  'utf8',
);

function numberFrom(source, name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+)`));
  return match ? Number(match[1]) : null;
}

const tabletMinWidth = numberFrom(uiSource, 'TABLET_MIN_WIDTH');
const navigationRailWidth = numberFrom(uiSource, 'NAVIGATION_RAIL_WIDTH');
const tabletContentMaxWidth = numberFrom(appSource, 'TABLET_CONTENT_MAX_WIDTH');
const viewports = [600, 800, 840, 1280].map(width => {
  if (
    tabletMinWidth === null ||
    navigationRailWidth === null ||
    tabletContentMaxWidth === null
  ) {
    return { width, supported: false };
  }
  const available = width - navigationRailWidth;
  const content = Math.min(available, tabletContentMaxWidth);
  return {
    width,
    supported: width >= tabletMinWidth,
    rail: navigationRailWidth,
    content,
    outerGutter: (available - content) / 2,
  };
});

const report = {
  screenFiles: screenFiles.length,
  scrollOrListScreens: [...sources]
    .filter(([, source]) => /<(ScrollView|FlatList|SectionList)\b/.test(source))
    .map(([file]) => file),
  screensWithMaxWidth: [...sources]
    .filter(([, source]) => /maxWidth\s*:/.test(source))
    .map(([file]) => file),
  compactOnlyBottomNavigations: [...sources].reduce(
    (count, [, source]) => count + (source.match(/compactOnly/g)?.length ?? 0),
    0,
  ),
  tabletConstants: {
    tabletMinWidth,
    navigationRailWidth,
    tabletContentMaxWidth,
  },
  viewports,
  portraitLocked: /android:screenOrientation="portrait"/.test(manifestSource),
  themeFeatureReferences: [...sources, ['App.tsx', appSource]]
    .filter(([, source]) =>
      /Appearance|colorScheme|darkMode|themeMode/i.test(source),
    )
    .map(([file]) => file),
};

console.log(JSON.stringify(report, null, 2));
