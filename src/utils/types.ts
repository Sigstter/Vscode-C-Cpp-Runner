import * as vscode from 'vscode';

export interface JsonSettings {
  [name: string]: any;
}

export interface JsonConfiguration {
  configurations: any[];
}

export interface JsonInnerTask {
  args: string[];
  command: string;
  type: any;
  options: any;
  label: any;
}

export interface JsonTask {
  tasks: JsonInnerTask[];
}

export class Task extends vscode.Task {
  execution?: vscode.ShellExecution;
}

export enum Languages {
  c = 'C',
  cpp = 'Cpp',
}

export enum Compilers {
  gcc = 'gcc',
  gpp = 'g++',
  clang = 'clang',
  clangpp = 'clang++',
}

export enum Debuggers {
  lldb = 'lldb',
  gdb = 'gdb',
}

export enum Makefiles {
  make = 'make',
  makeMinGW = 'mingw32-make',
}

export enum OperatingSystems {
  windows = 'windows',
  linux = 'linux',
  mac = 'macos',
}

export enum Architectures {
  x86 = 'x86',
  x64 = 'x64',
}

export enum Builds {
  debug = 'Debug',
  release = 'Release',
}

export enum Tasks {
  build = 'Build',
  run = 'Run',
  clean = 'Clean',
  debug = 'Debug',
}

export function isUri(input: any): input is vscode.Uri {
  return input && input instanceof vscode.Uri;
}

export function isString(input: any): input is string {
  return typeof input === 'string';
}

export function isNumber(input: any): input is number {
  return typeof input === 'number';
}

export function isBoolean(input: any): input is boolean {
  return typeof input === 'boolean';
}

export function isObject(input: any): input is object {
  return typeof input === 'object';
}

export function isArray(input: any): input is any[] {
  return input instanceof Array;
}

export function isOptionalString(input: any): input is string | undefined {
  return input === undefined || isString(input);
}

export function isArrayOfString(input: any): input is string[] {
  return isArray(input) && input.every(isString);
}

export function isOptionalArrayOfString(
  input: any,
): input is string[] | undefined {
  return input === undefined || isArrayOfString(input);
}
