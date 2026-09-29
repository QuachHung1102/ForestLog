import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const files = [
  'src/screens/ui.tsx',
  'src/screens/patrol/CreateForestAreaScreen.tsx',
  'src/screens/patrol/CreatePatrolScreen.tsx',
  'src/screens/patrol/ActivePatrolScreen.tsx',
  'src/screens/map/FieldMapScreen.tsx',
];

const palette = {
  background: '#F3F6F1',
  surface: '#FFFFFF',
  primary: '#185C3A',
  primaryDark: '#123C29',
  text: '#17211B',
  textSecondary: '#526159',
  danger: '#B42318',
};

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => channel(parseInt(value, 16)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return Number(((values[0] + 0.05) / (values[1] + 0.05)).toFixed(2));
}

function stylesIn(sourceFile) {
  const styles = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === 'StyleSheet.create' &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      for (const property of node.arguments[0].properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) continue;
        const values = {};
        for (const item of property.initializer.properties) {
          if (ts.isPropertyAssignment(item)) values[item.name.getText(sourceFile)] = item.initializer.getText(sourceFile);
        }
        styles.set(property.name.getText(sourceFile), values);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return styles;
}

const controls = [];
const textStyles = [];

for (const relativePath of files) {
  const sourceText = fs.readFileSync(relativePath, 'utf8');
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles = stylesIn(sourceFile);

  for (const [name, values] of styles) {
    const fontSize = Number(values.fontSize);
    if (Number.isFinite(fontSize)) textStyles.push({ file: relativePath, style: name, fontSize });
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile).split('.').at(-1);
      if (tag === 'Pressable' || tag === 'TextInput') {
        const styleAttribute = node.attributes.properties.find(
          property => ts.isJsxAttribute(property) && property.name.text === 'style',
        );
        const styleText = styleAttribute?.initializer?.getText(sourceFile) ?? '';
        const styleNames = [...styleText.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(match => match[1]);
        const dimensions = styleNames.map(name => styles.get(name) ?? {});
        const widths = dimensions.map(value => Number(value.width)).filter(Number.isFinite);
        const heights = dimensions
          .flatMap(value => [Number(value.height), Number(value.minHeight)])
          .filter(Number.isFinite);
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        controls.push({
          file: relativePath,
          line,
          tag,
          styles: styleNames,
          width: widths.length ? Math.max(...widths) : null,
          height: heights.length ? Math.max(...heights) : null,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const contrastPairs = [
  ['text/background', palette.text, palette.background],
  ['secondary/background', palette.textSecondary, palette.background],
  ['primary/surface', palette.primary, palette.surface],
  ['danger/surface', palette.danger, palette.surface],
  ['surface/primary', palette.surface, palette.primary],
  ['surface/primaryDark', palette.surface, palette.primaryDark],
].map(([name, foreground, background]) => ({ name, ratio: contrast(foreground, background) }));

const report = {
  files: files.length,
  controls: controls.length,
  controlsWithMeasuredHeightBelow48: controls.filter(control => control.height !== null && control.height < 48),
  controlsWithMeasuredWidthBelow48: controls.filter(control => control.width !== null && control.width < 48),
  textStylesBelow12: textStyles.filter(style => style.fontSize < 12),
  contrastPairs,
  contrastPairsBelowAA: contrastPairs.filter(pair => pair.ratio < 4.5),
};

console.log(JSON.stringify(report, null, 2));
