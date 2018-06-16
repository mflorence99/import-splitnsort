import * as assert from 'assert';

import { Parser } from '../parser';

suite('Parser Tests', () => {

  const parser = new Parser(`
    import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
    import { LayoutPrefs, LayoutSearch, SwapWith } from '../state/layout';
    import { RootPageComponent } from '../pages/root/page';
    import { Store } from '@ngxs/store';
    import { Tab } from '../state/tabs';
    import { TerminalService } from '../services/terminal';
    import { config } from '../config';
    import { debounce as bouncer } from 'ellib';
    import $ from 'JQuery';
    import validator from './ZipCodeValidator';
    import zip = require('./ZipCodeValidator');
    import * as vscode from 'vscode';
    import 'code.js';
    import x, {y} from 'hot-new-module';
  `);

  test('Parse a representative set of imports', async () => {
    await parser.parse();
    assert.strictEqual(parser.defaultImports['$'], 'JQuery');
    assert.strictEqual(parser.defaultImports['x'], 'hot-new-module');
    assert.strictEqual(parser.externalImports['zip'], './ZipCodeValidator');
    assert.strictEqual(parser.namedClassImports['ChangeDetectionStrategy'], '@angular/core');
    assert.strictEqual(parser.namedClassImports['Component'], '@angular/core');
    assert.strictEqual(parser.namedClassImports['HostListener'], '@angular/core');
    assert.strictEqual(parser.namedClassImports['Input'], '@angular/core');
    assert.strictEqual(parser.namedFunctionImports['debounce as bouncer'], 'ellib');
    assert.strictEqual(parser.namedFunctionImports['y'], 'hot-new-module');
    assert.strictEqual(parser.namespaceImports['vscode'], 'vscode');
    assert.strictEqual(parser.stringImports[0], 'code.js');
    assert.strictEqual(parser.braces[0], '{ ');
    assert.strictEqual(parser.braces[1], ' }');
    assert.strictEqual(parser.quote, `'`);
    assert.strictEqual(parser.semicolon, ';');
    assert.strictEqual(parser.range.start.line, 1);
    assert.strictEqual(parser.range.start.character, 4);
    assert.strictEqual(parser.range.end.line, 14);
    assert.strictEqual(parser.range.end.character, 40);
    const imports = parser.produce();
    assert(imports.includes(`import { Component } from '@angular/core';`));
    assert(imports.includes(`import $ from 'JQuery';`));
    assert(imports.includes(`import 'code.js';`));
  });

  const noImports = new Parser('hello world!');

  test('Efficiently handle file with no imports', () => {
    noImports.parse().then(() => {
      const imports = parser.produce();
      assert.strictEqual(imports, ''); 
    }); 
  });

});
