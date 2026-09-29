import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..', 'src', 'screens');
const files = [];

function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visitDirectory(target);
    else if (entry.name.endsWith('.tsx')) files.push(target);
  }
}

function attribute(opening, name) {
  return opening.attributes.properties.some(
    property => ts.isJsxAttribute(property) && property.name.text === name,
  );
}

function staticText(node) {
  return node.children
    .map(child => {
      if (ts.isJsxText(child)) return child.text;
      if (
        ts.isJsxExpression(child) &&
        child.expression &&
        ts.isStringLiteral(child.expression)
      ) {
        return child.expression.text;
      }
      return '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

visitDirectory(root);
const risks = [];
let textElements = 0;
let singleLineElements = 0;

for (const file of files) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function walk(node) {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(source) === 'Text'
    ) {
      textElements += 1;
      const singleLine = attribute(node.openingElement, 'numberOfLines');
      if (singleLine) singleLineElements += 1;
      const text = staticText(node);
      if (text.length > 32 && !singleLine) {
        const line =
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        risks.push({
          file: path.relative(path.resolve(root, '..', '..'), file),
          line,
          characters: text.length,
          text,
        });
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
}

console.log(
  JSON.stringify(
    {
      files: files.length,
      textElements,
      singleLineElements,
      longStaticTextWithoutLineLimit: risks.length,
      risks,
    },
    null,
    2,
  ),
);
