import { describe, expect, it } from 'vitest';
import { assertKnownCommonThemeXml } from '../../../packages/document-formats/src/ooxml/xml-guard.js';

const theme = `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" name="Office">
  <a:themeElements><a:clrScheme name="Synthetic"><a:dk1><a:srgbClr val="000000"/></a:dk1></a:clrScheme></a:themeElements>
</a:theme>`;

describe('common OOXML theme guard', () => {
  it('accepts the frozen namespace and QName subset', () => {
    expect(() => assertKnownCommonThemeXml(theme)).not.toThrow();
  });

  it('rejects an unknown namespace, element, or attribute', () => {
    expect(() =>
      assertKnownCommonThemeXml(
        theme.replace(
          'http://schemas.openxmlformats.org/drawingml/2006/main',
          'urn:synthetic:unknown',
        ),
      ),
    ).toThrow();
    expect(() =>
      assertKnownCommonThemeXml(
        theme.replace('</a:themeElements>', '<a:unknown/></a:themeElements>'),
      ),
    ).toThrow();
    expect(() =>
      assertKnownCommonThemeXml(theme.replace('<a:dk1>', '<a:dk1 secret="synthetic">')),
    ).toThrow();
  });

  it('rejects duplicate attributes and a second root element', () => {
    expect(() =>
      assertKnownCommonThemeXml(theme.replace('name="Office"', 'name="Office" name="Duplicate"')),
    ).toThrow();
    expect(() => assertKnownCommonThemeXml(`${theme}<a:theme name="Second"></a:theme>`)).toThrow();
  });
});
