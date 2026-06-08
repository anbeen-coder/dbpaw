export * from "../types";

export { isTauri, normalizeImportDriver, getImportDriverCapability } from "./core";

import { queryApi } from "./query";
import { metadataApi } from "./metadata";
import { redisApi } from "./redis";
import { elasticsearchApi } from "./elasticsearch";
import { mongodbApi } from "./mongodb";
import { aiApi } from "./ai";
import { connectionsApi } from "./connections";
import { systemApi } from "./system";

export const api = {
  ...queryApi,
  ...metadataApi,
  ...redisApi,
  ...elasticsearchApi,
  ...mongodbApi,
  ...aiApi,
  ...connectionsApi,
  ...systemApi,
};
