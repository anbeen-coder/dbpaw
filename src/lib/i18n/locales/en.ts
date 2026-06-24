import { common } from "./en/common";
import { app } from "./en/app";
import { sidebar } from "./en/sidebar";
import { settings } from "./en/settings";
import { connection } from "./en/connection";
import { redis } from "./en/redis";
import { aiSidebar, chatComposer } from "./en/aiSidebar";
import { sqlEditor, saveQueryDialog } from "./en/sqlEditor";
import { datagrid, tableView, tableSelector } from "./en/dataGrid";
import {
  tableMetadata,
  routineMetadata,
  createTable,
  alterTable,
  manageIndexes,
} from "./en/tableMetadata";
import { elasticsearch, erDiagram } from "./en/elasticsearch";

export const en = {
  common,
  app,
  sidebar,
  settings,
  datagrid,
  connection,
  redis,
  aiSidebar,
  chatComposer,
  tableSelector,
  sqlEditor,
  saveQueryDialog,
  tableView,
  tableMetadata,
  routineMetadata,
  createTable,
  alterTable,
  manageIndexes,
  elasticsearch,
  erDiagram,
} as const;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepStringify<T[K]>
      : T[K];
};

export type Translations = DeepStringify<typeof en>;
