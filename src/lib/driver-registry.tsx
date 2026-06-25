import type { ReactNode } from "react";
import type { DriverMetadata } from "./driver-metadata";
import { DRIVER_METADATA } from "./driver-metadata";
import { DRIVER_ICON_MAP } from "./driver-icons";
import { DRIVER_TREE_MAP } from "./driver-tree-config";
import type { TreeConfig, TreeCallbacks } from "./tree-adapters/types.tsx";

export type {
  Driver,
  DriverKind,
  ImportDriverCapability,
  DriverMetadata,
} from "./driver-metadata";
export {
  DRIVER_METADATA,
  getDriverConfig,
  getDefaultPort,
  isFileBasedDriver,
  isMysqlFamilyDriver,
  isRegisteredDriver,
  isDatabaseScopedDriver,
  getDefaultSchema,
  resolveTableScope,
  quoteIdentifierForDriver,
  shouldQualifyTableSchema,
  getQualifiedTableName,
  supportsSSLCA,
  supportsCreateDatabase,
  supportsSchemaBrowsing,
  getDriverKind,
  isKeyValueDriver,
  getImportDriverCapability,
} from "./driver-metadata";
export { getConnectionIcon, DRIVER_ICON_MAP } from "./driver-icons";
export { getTreeConfig, DRIVER_TREE_MAP } from "./driver-tree-config";

export interface DriverConfig extends DriverMetadata {
  icon: () => ReactNode;
  treeConfig?: TreeConfig | ((callbacks: TreeCallbacks) => TreeConfig);
}

export const DRIVER_REGISTRY: DriverConfig[] = DRIVER_METADATA.map((m) => ({
  ...m,
  icon: DRIVER_ICON_MAP[m.id],
  treeConfig: DRIVER_TREE_MAP[m.id],
}));
