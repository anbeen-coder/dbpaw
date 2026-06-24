import type { Translations } from "./en";
import { common } from "./zh/common";
import { app } from "./zh/app";
import { sidebar } from "./zh/sidebar";
import { settings } from "./zh/settings";
import { connection } from "./zh/connection";
import { redis } from "./zh/redis";
import { aiSidebar, chatComposer } from "./zh/aiSidebar";
import { sqlEditor, saveQueryDialog } from "./zh/sqlEditor";
import { datagrid, tableView, tableSelector } from "./zh/dataGrid";
import {
  tableMetadata,
  routineMetadata,
  createTable,
  alterTable,
  manageIndexes,
} from "./zh/tableMetadata";
import { elasticsearch, erDiagram } from "./zh/elasticsearch";

export const zh: Translations = {
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
};
