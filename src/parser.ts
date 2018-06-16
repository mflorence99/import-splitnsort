import { ExternalModuleImport } from 'typescript-parser';
import { File } from 'typescript-parser';
import { Import } from 'typescript-parser';
import { NamedImport } from 'typescript-parser';
import { NamespaceImport } from 'typescript-parser';
import { Position } from 'vscode';
import { Range } from 'vscode';
import { TextEdit } from 'vscode';
import { StringImport } from 'typescript-parser';
import { SymbolSpecifier } from 'typescript-parser';
import { TypescriptParser } from 'typescript-parser';

/**
 * Parse TypeScript and extract imports
 */

export class Parser {

  public defaultImports: Dictionary = { };
  public externalImports: Dictionary = { };
  public namedClassImports: Dictionary = { };
  public namedFunctionImports: Dictionary = { };
  public namespaceImports: Dictionary = { };
  public stringImports: string[] = [];

  public range = new Range(0, 0, 0, 0);

  public braces = ['{ ', ' }'];
  public quote = `'`;
  public semicolon = ';';

  private parser = new TypescriptParser();

  /** ctor */
  constructor(private src: string) { }

  /** Make an edit to replace imports */
  static makeEdit(src: string): Promise<TextEdit[]> {
    return new Promise((resolve, reject) => {
      const parser = new Parser(src);
      parser.parse().then(() => {
        const imports = parser.produce();
        resolve((imports.length > 0)? [TextEdit.replace(parser.range, imports)] : []);
      });
    });
  }

  /** Parse the source, extracting the imports */
  parse(): Promise<any> {
    if (!this.src.includes('import '))
      return Promise.resolve();
    else return new Promise((resolve, reject) => {
      this.parser.parseSource(this.src).then((file: File) => {
        let start = Number.MAX_SAFE_INTEGER;
        let end = Number.MIN_SAFE_INTEGER;
        file.imports.forEach((node: Import) => {
          start = Math.min(start, node.start);
          end = Math.max(end, node.end);
          // process each type of import
          switch (node.constructor) {
            case ExternalModuleImport:
              this.extractExternal(<ExternalModuleImport>node);
              break;
            case NamedImport:
              this.extractNamed(<NamedImport>node);
              break;
            case NamespaceImport:
              this.extractNamespace(<NamespaceImport>node);
              break;
            case StringImport:
              this.extractString(<StringImport>node);
              break;
          }
        });
        this.detectCodingStyle(start, end);
        this.makeRange(start, end);
        resolve();
      });
    });
  }

  /** Produce sorted import statements */
  produce(): string {
    const stmts = this.produceNamespace()
      .concat(this.produceNamedClass())
      .concat(this.produceNamedFunction())
      .concat(this.produceDefault())
      .concat(this.produceExternal())
      .concat(this.produceString());
    // NOTE: if there are any imports at all, there'll be an initial blank line
    return (stmts.length > 0)? stmts.slice(1).join('\n') : '';
  }

  // private methods

  private detectCodingStyle(start: number,
                            end: number): void {
    const imports = this.src.substring(start, end);
    if (!imports.includes(this.braces[0]))
      this.braces[0] = '}';
    if (!imports.includes(this.braces[1]))
      this.braces[1] = '}';
    if (!imports.includes(this.quote))
      this.quote = '"';
    if (!imports.includes(this.semicolon))
      this.semicolon = '';
  }

  private extractExternal(node: ExternalModuleImport): void {
    this.externalImports[node.alias] = node.libraryName;
  }

  private extractNamed(node: NamedImport): void {
    if (node.defaultAlias)
      this.defaultImports[node.defaultAlias] = node.libraryName;
    node.specifiers.forEach((specifier: SymbolSpecifier) => {
      const initialChar = specifier.specifier[0];
      const dict = (initialChar === initialChar.toLowerCase())?
        this.namedFunctionImports : this.namedClassImports;
      if (specifier.alias)
        dict[`${specifier.specifier} as ${specifier.alias}`] = node.libraryName;
      else dict[specifier.specifier] = node.libraryName;
    });
  }

  private extractNamespace(node: NamespaceImport): void {
    this.namespaceImports[node.alias] = node.libraryName;
  }

  private extractString(node: StringImport): void {
    this.stringImports.push(node.libraryName);
  }

  // NOTE: awkward! we have to convert characters from parser into line/character
  private makeRange(start: number,
                    end: number): void {
    let line = 0, character = 0;
    let spos: Position, epos: Position;
    for (let ix = 0; ix < end; ix++) {
      if (ix === start)
        spos = new Position(line, character);
      // increment counters
      if (this.src[ix] === '\n') {
        line += 1;
        character = 0;
      }
      else character += 1;
    }
    // complete range
    epos = new Position(line, character);
    this.range = new Range(spos, epos);
  }

  private produceDefault(): string[] {
    const stmts: string[] = [];
    this.sortedNamesIn(this.defaultImports).forEach((name, ix) => {
      if (ix === 0)
        stmts.push('');
      const library = this.defaultImports[name];
      stmts.push(`import ${name} from ${this.quote}${library}${this.quote}${this.semicolon}`);
    });
    return stmts;
  }

  private produceExternal(): string[] {
    const stmts: string[] = [];
    this.sortedNamesIn(this.externalImports).forEach((name, ix) => {
      if (ix === 0)
        stmts.push('');
      const library = this.externalImports[name];
      stmts.push(`import ${name} = require(${this.quote}${library}${this.quote})${this.semicolon}`);
    });
    return stmts;
  }

  private produceNamedClass(): string[] {
    const stmts: string[] = [];
    this.sortedNamesIn(this.namedClassImports).forEach((name, ix) => {
      if (ix === 0)
        stmts.push('');
      const library = this.namedClassImports[name];
      stmts.push(`import ${this.braces[0]}${name}${this.braces[1]} from ${this.quote}${library}${this.quote}${this.semicolon}`);
    });
    return stmts;
  }

  private produceNamedFunction(): string[] {
    const stmts: string[] = [];
    this.sortedNamesIn(this.namedFunctionImports).forEach((name, ix) => {
      if (ix === 0)
        stmts.push('');
      const library = this.namedFunctionImports[name];
      stmts.push(`import ${this.braces[0]}${name}${this.braces[1]} from ${this.quote}${library}${this.quote}${this.semicolon}`);
    });
    return stmts;
  }

  private produceNamespace(): string[] {
    const stmts: string[] = [];
    this.sortedNamesIn(this.namespaceImports).forEach((name, ix) => {
      if (ix === 0)
        stmts.push('');
      const library = this.namespaceImports[name];
      stmts.push(`import * as ${name} from ${this.quote}${library}${this.quote}${this.semicolon}`);
    });
    return stmts;
  }

  private produceString(): string[] {
    const stmts: string[] = [];
    this.stringImports.sort(this.sortCaseInsensitive).forEach((library, ix) => {
      if (ix === 0)
        stmts.push('');
      stmts.push(`import ${this.quote}${library}${this.quote}${this.semicolon}`);
    });
    return stmts;
  }

  private sortCaseInsensitive(a, b): number {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  }

  private sortedNamesIn(dict: Dictionary): string[] {
    return Object.keys(dict).sort(this.sortCaseInsensitive);
  }
  
}

/**
 * Dictionary of imports
 * 
 * name of import ==> module ID
 */

 export interface Dictionary {
   [nm: string]: string;
 }
