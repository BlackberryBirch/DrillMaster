import { Drill } from './drill';

export interface DrillFile {
  version: string;
  format: string;
  drill: Drill;
}

export interface FileFormatAdapter {
  serialize(drill: Drill): string;
  deserialize(data: string): Drill;
  validate(data: unknown): boolean;
  getFileExtension(): string;
}

