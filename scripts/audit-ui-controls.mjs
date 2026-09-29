import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const screenRoot = path.resolve('src/screens');
const nativeControls = new Set([
  'BorderlessButton',
  'Button',
  'Pressable',
  'RectButton',
  'Touchable',
  'TouchableHighlight',
  'TouchableNativeFeedback',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
]);
const spacingKeys = new Set([
  'padding',
  'paddingBottom',
  'paddingEnd',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingTop',
  'paddingVertical',
]);
const sizeKeys = new Set(['height', 'minHeight']);

function walk(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.name.endsWith('.tsx') ? [absolute] : [];
  });
}

function tagName(node) {
  return node.tagName.getText().split('.').at(-1);
}

function attribute(node, name) {
  return node.attributes.properties.find(
    property => ts.isJsxAttribute(property) && property.name.text === name,
  );
}

function styleNames(node) {
  const style = attribute(node, 'style');
  if (!style?.initializer || !ts.isJsxExpression(style.initializer)) return [];
  const text = style.initializer.expression?.getText() ?? '';
  return [...text.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(match => match[1]);
}

function styleObjects(sourceFile) {
  const result = new Map();

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === 'StyleSheet.create' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      for (const property of node.arguments[0].properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText().replace(/^['"]|['"]$/g, '');
        if (!ts.isObjectLiteralExpression(property.initializer)) continue;
        const values = {};
        for (const value of property.initializer.properties) {
          if (!ts.isPropertyAssignment(value)) continue;
          values[value.name.getText()] = value.initializer.getText();
        }
        result.set(name, values);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

function isEmptyHandler(handler) {
  if (!handler?.initializer || !ts.isJsxExpression(handler.initializer)) return false;
  const expression = handler.initializer.expression;
  if (!expression) return true;
  if (!ts.isArrowFunction(expression) && !ts.isFunctionExpression(expression)) {
    return expression.getText() === 'undefined';
  }
  if (ts.isBlock(expression.body)) return expression.body.statements.length === 0;
  return expression.body.getText() === 'undefined';
}

function isHardDisabled(node) {
  const disabled = attribute(node, 'disabled');
  if (!disabled) return false;
  if (!disabled.initializer) return true;
  return (
    ts.isJsxExpression(disabled.initializer) &&
    disabled.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword
  );
}

const controls = [];
for (const file of walk(screenRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const styles = styleObjects(sourceFile);

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagName(node);
      const handler = attribute(node, 'onPress');
      if (nativeControls.has(tag) || handler) {
        const names = styleNames(node);
        const keys = new Set(names.flatMap(name => Object.keys(styles.get(name) ?? {})));
        const heights = names
          .flatMap(name => {
            const style = styles.get(name) ?? {};
            return [...sizeKeys]
              .map(key => style[key])
              .filter(Boolean)
              .map(value => Number(value));
          })
          .filter(Number.isFinite);
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        controls.push({
          file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
          line,
          tag,
          native: nativeControls.has(tag),
          hardDisabled: isHardDisabled(node),
          handler: handler ? (isEmptyHandler(handler) ? 'empty' : 'present') : 'missing',
          styles: names,
          hasPadding: [...keys].some(key => spacingKeys.has(key)),
          measuredHeight: heights.length ? Math.max(...heights) : null,
          below48: heights.length ? Math.max(...heights) < 48 : null,
          hasAccessibilityLabel: Boolean(attribute(node, 'accessibilityLabel')),
          hasAccessibilityRole: Boolean(attribute(node, 'accessibilityRole')),
          hasHitSlop: Boolean(attribute(node, 'hitSlop')),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const summary = {
  filesScanned: walk(screenRoot).length,
  controls: controls.length,
  nativeControls: controls.filter(control => control.native).length,
  customControlsWithOnPress: controls.filter(control => !control.native).length,
  missingHandlers: controls.filter(control => control.handler === 'missing').length,
  emptyHandlers: controls.filter(control => control.handler === 'empty').length,
  activeEmptyHandlers: controls.filter(
    control => control.handler === 'empty' && !control.hardDisabled,
  ).length,
  nativeWithoutDirectPadding: controls.filter(
    control => control.native && !control.hasPadding,
  ).length,
  nativeMeasuredBelow48: controls.filter(
    control => control.native && control.below48 === true,
  ).length,
  nativeUnmeasuredHeight: controls.filter(
    control => control.native && control.measuredHeight === null,
  ).length,
  nativeWithoutAccessibilityLabel: controls.filter(
    control => control.native && !control.hasAccessibilityLabel,
  ).length,
  nativeWithoutAccessibilityRole: controls.filter(
    control => control.native && !control.hasAccessibilityRole,
  ).length,
  nativeWithoutHitSlop: controls.filter(
    control => control.native && !control.hasHitSlop,
  ).length,
};

console.log(JSON.stringify({summary, controls}, null, 2));
