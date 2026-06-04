import { Loader2, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { RedisBitmapBit } from "@/services/api";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleApiError } from "@/lib/errors";
import { useRedisKey } from "./useRedisKey";
import { RedisKeyFormHeader } from "./RedisKeyFormHeader";
import { RedisStringViewer } from "./value-viewer/RedisStringViewer";
import { RedisHashViewer } from "./value-viewer/RedisHashViewer";
import { RedisListViewer } from "./value-viewer/RedisListViewer";
import { RedisSetViewer } from "./value-viewer/RedisSetViewer";
import { RedisZSetViewer } from "./value-viewer/RedisZSetViewer";
import { RedisStreamViewer } from "./value-viewer/RedisStreamViewer";
import { RedisJsonViewer } from "./value-viewer/RedisJsonViewer";
import { RedisBitmapViewer } from "./value-viewer/RedisBitmapViewer";
import { RedisHyperLogLogViewer } from "./value-viewer/RedisHyperLogLogViewer";
import { RedisGeoViewer } from "./value-viewer/RedisGeoViewer";

interface RedisKeyViewProps {
  connectionId: number;
  database: string;
  redisKey: string;
  onDeleted?: () => void;
  onSavedKeyChange?: (key: string) => void;
}

export function RedisKeyView({
  connectionId,
  database,
  redisKey,
  onDeleted,
  onSavedKeyChange,
}: RedisKeyViewProps) {
  const { t } = useTranslation();
  const hk = useRedisKey({
    connectionId,
    database,
    redisKey,
    onDeleted,
    onSavedKeyChange,
  });

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <RedisKeyFormHeader
          isCreateMode={hk.isCreateMode}
          redisKey={redisKey}
          record={hk.record}
          typeBadge={hk.typeBadge}
          database={database}
          keyName={hk.keyName}
          onKeyNameChange={hk.setKeyName}
          valueKind={hk.value.kind === "none" ? "string" : hk.value.kind}
          onKindChange={hk.handleKindChange}
          ttl={hk.ttl}
          onTtlChange={hk.setTtl}
          onApplyTtl={() => void hk.handleApplyTtl()}
          isSaving={hk.isSaving}
          valueTotalLen={hk.valueTotalLen}
          onRefresh={() => void hk.load()}
          onDelete={() => hk.setPendingAction("delete")}
          isLoading={hk.isLoading}
          setOptionsExpanded={hk.setOptionsExpanded}
          onSetOptionsExpandedChange={hk.setSetOptionsExpanded}
          setNx={hk.setNx}
          onSetNxChange={hk.setSetNx}
          setXx={hk.setXx}
          onSetXxChange={hk.setSetXx}
          setPx={hk.setPx}
          onSetPxChange={hk.setSetPx}
          setKeepttl={hk.setKeepttl}
          onSetKeepttlChange={hk.setSetKeepttl}
        />

        {/* Value viewer */}
        <div className="space-y-2">
          <Label>Value</Label>

          {hk.value.kind === "string" &&
            hk.record?.extra?.subtype === "bitmap" && (
              <RedisBitmapViewer
                value={hk.value.value}
                isBinary={hk.record?.isBinary ?? false}
                onChange={(v) => hk.setValue({ kind: "string", value: v })}
                onPatch={async (bits: RedisBitmapBit[]) => {
                  try {
                    await api.redis.patchKey(connectionId, database, {
                      key: redisKey,
                      ttlSeconds: null,
                      bitmapSet: bits,
                    });
                    toast.success("Bitmap updated");
                    await hk.load();
                  } catch (e) {
                    handleApiError(t("redis.key.bitmapUpdateFailed"), e);
                  }
                }}
                extra={hk.record?.extra}
              />
            )}
          {hk.value.kind === "string" &&
            hk.record?.extra?.subtype === "hyperloglog" && (
              <RedisHyperLogLogViewer
                value={hk.value.value}
                isBinary={hk.record?.isBinary ?? false}
                extra={hk.record?.extra}
                connectionId={connectionId}
                database={database}
                redisKey={redisKey}
                onRefresh={() => void hk.load()}
              />
            )}
          {hk.value.kind === "string" &&
            hk.record?.extra?.subtype !== "bitmap" &&
            hk.record?.extra?.subtype !== "hyperloglog" && (
              <RedisStringViewer
                value={hk.value.value}
                onChange={(v) => hk.setValue({ kind: "string", value: v })}
                isBinary={hk.record?.isBinary}
                extra={hk.record?.extra}
                onIncrBy={async (amount) => {
                  try {
                    await api.redis.patchKey(connectionId, database, {
                      key: redisKey,
                      ttlSeconds: null,
                      stringIncrBy: amount,
                    });
                    toast.success("Value incremented");
                    await hk.load();
                  } catch (e) {
                    handleApiError(t("redis.key.incrementFailed"), e);
                  }
                }}
                onIncrByInt={async (amount) => {
                  try {
                    await api.redis.patchKey(connectionId, database, {
                      key: redisKey,
                      ttlSeconds: null,
                      stringIncrByInt: amount,
                    });
                    toast.success("Value incremented");
                    await hk.load();
                  } catch (e) {
                    handleApiError(t("redis.key.incrementFailed"), e);
                  }
                }}
              />
            )}
          {hk.value.kind === "hash" && (
            <RedisHashViewer
              value={hk.value.value}
              onChange={(v) => hk.setValue({ kind: "hash", value: v })}
              onHashIncrBy={async (field, amount) => {
                try {
                  await api.redis.patchKey(connectionId, database, {
                    key: redisKey,
                    ttlSeconds: null,
                    hashIncrBy: { [field]: amount },
                  });
                  toast.success("Field incremented");
                  await hk.load();
                } catch (e) {
                  handleApiError(t("redis.key.incrementFailed"), e);
                }
              }}
            />
          )}
          {hk.value.kind === "list" && (
            <RedisListViewer
              value={hk.value.value}
              onChange={(v) => hk.setValue({ kind: "list", value: v })}
              onLindex={async (index) => {
                const result = await api.redis.lindex(
                  connectionId,
                  database,
                  redisKey,
                  index,
                );
                return result;
              }}
              onLpos={async (element, rank, count, maxlen) => {
                const positions = await api.redis.lpos(
                  connectionId,
                  database,
                  redisKey,
                  element,
                  rank,
                  count,
                  maxlen,
                );
                return positions;
              }}
              onLtrim={async (start, stop) => {
                await api.redis.ltrim(
                  connectionId,
                  database,
                  redisKey,
                  start,
                  stop,
                );
                toast.success("List trimmed");
                await hk.load();
              }}
              onLinsert={async (position, pivot, element) => {
                const len = await api.redis.linsert(
                  connectionId,
                  database,
                  redisKey,
                  position,
                  pivot,
                  element,
                );
                toast.success(`Element inserted (new length: ${len})`);
                await hk.load();
                return len;
              }}
              onLmove={async (destination, srcDirection, dstDirection) => {
                const moved = await api.redis.lmove(
                  connectionId,
                  database,
                  redisKey,
                  destination,
                  srcDirection,
                  dstDirection,
                );
                if (moved !== null) {
                  toast.success(`Moved "${moved}" to "${destination}"`);
                  await hk.load();
                } else {
                  toast.warning("Source list is empty");
                }
                return moved;
              }}
            />
          )}
          {hk.value.kind === "set" && (
            <RedisSetViewer
              value={hk.value.value}
              onChange={(v) => hk.setValue({ kind: "set", value: v })}
              onSismember={async (member) => {
                const exists = await api.redis.sismember(
                  connectionId,
                  database,
                  redisKey,
                  member,
                );
                return exists;
              }}
              onSetOperation={async (keys, op) => {
                const allKeys = [redisKey, ...keys];
                const results = await api.redis.setOperation(
                  connectionId,
                  database,
                  allKeys,
                  op,
                );
                return results;
              }}
              onSmove={async (destination, member) => {
                const moved = await api.redis.smove(
                  connectionId,
                  database,
                  redisKey,
                  destination,
                  member,
                );
                if (moved) {
                  toast.success(`Member moved to "${destination}"`);
                  await hk.load();
                } else {
                  toast.warning("Member does not exist in source set");
                }
                return moved;
              }}
            />
          )}
          {hk.value.kind === "zSet" &&
            hk.record?.extra?.subtype === "geo" && (
              <RedisGeoViewer
                value={hk.value.value}
                onChange={(v) => hk.setValue({ kind: "zSet", value: v })}
                extra={hk.record?.extra}
                connectionId={connectionId}
                database={database}
                redisKey={redisKey}
                onRefresh={() => void hk.load()}
              />
            )}
          {hk.value.kind === "zSet" &&
            hk.record?.extra?.subtype !== "geo" && (
              <RedisZSetViewer
                value={hk.value.value}
                onChange={(v) => hk.setValue({ kind: "zSet", value: v })}
                extra={hk.record?.extra}
                onZsetIncrBy={async (member, amount) => {
                  try {
                    await api.redis.patchKey(connectionId, database, {
                      key: redisKey,
                      ttlSeconds: null,
                      zsetIncrBy: [{ member, score: amount }],
                    });
                    toast.success("Score updated");
                    await hk.load();
                  } catch (e) {
                    handleApiError(t("redis.key.scoreUpdateFailed"), e);
                  }
                }}
                onZRangeByScore={async (min, max) => {
                  const result = await api.redis.zrangebyscore(
                    connectionId,
                    database,
                    redisKey,
                    min,
                    max,
                  );
                  return result;
                }}
                onZRank={async (member, reverse) => {
                  const rank = await api.redis.zrank(
                    connectionId,
                    database,
                    redisKey,
                    member,
                    reverse,
                  );
                  return rank;
                }}
                onZScore={async (member) => {
                  const score = await api.redis.zscore(
                    connectionId,
                    database,
                    redisKey,
                    member,
                  );
                  return score;
                }}
                onZMScore={async (members) => {
                  const scores = await api.redis.zmscore(
                    connectionId,
                    database,
                    redisKey,
                    members,
                  );
                  return scores;
                }}
                onZRangeByLex={async (min, max) => {
                  const result = await api.redis.zrangebylex(
                    connectionId,
                    database,
                    redisKey,
                    min,
                    max,
                  );
                  return result;
                }}
                onZPopMin={async (count) => {
                  try {
                    await api.redis.zpopmin(
                      connectionId,
                      database,
                      redisKey,
                      count,
                    );
                    toast.success("Popped member with lowest score");
                    await hk.load();
                  } catch (e) {
                    handleApiError(t("redis.key.popMinFailed"), e);
                  }
                }}
                onZPopMax={async (count) => {
                  try {
                    await api.redis.zpopmax(
                      connectionId,
                      database,
                      redisKey,
                      count,
                    );
                    toast.success("Popped member with highest score");
                    await hk.load();
                  } catch (e) {
                    handleApiError(t("redis.key.popMaxFailed"), e);
                  }
                }}
              />
            )}
          {hk.value.kind === "stream" && (
            <RedisStreamViewer
              connectionId={connectionId}
              database={database}
              redisKey={redisKey}
              value={hk.value.value}
              onChange={(v) => hk.setValue({ kind: "stream", value: v })}
              totalLen={hk.valueTotalLen}
              extra={hk.record?.extra}
              isCreateMode={hk.isCreateMode}
            />
          )}
          {hk.value.kind === "json" && (
            <RedisJsonViewer
              value={hk.value.value}
              onChange={(v) => hk.setValue({ kind: "json", value: v })}
              moduleMissing={
                hk.record?.extra?.subtype === "json-module-missing"
              }
              readOnly={hk.record?.extra?.subtype === "json-module-missing"}
            />
          )}
          {hk.value.kind === "none" && (
            <div className="text-sm text-muted-foreground italic py-4">
              Key does not exist or type is unsupported.
            </div>
          )}

          {hk.valueIsPartial && !hk.isCreateMode && hk.value.kind !== "stream" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
              <span>
                Showing {hk.loadedCount} of {hk.valueTotalLen} items
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void hk.handleLoadMore()}
                disabled={hk.isLoadingMore}
              >
                {hk.isLoadingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Load more
              </Button>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={() => void hk.handleSave()}
            disabled={
              hk.isSaving ||
              Boolean(hk.jsonValidationError) ||
              hk.jsonModuleMissing
            }
          >
            {hk.isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <AlertDialog
        open={hk.pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) hk.setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hk.pendingAction === "delete"
                ? "Delete this key?"
                : hk.pendingAction === "binary_overwrite"
                  ? "Overwrite binary key?"
                  : hk.pendingAction === "force_rename"
                    ? "Key already exists"
                    : "Overwrite key data?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hk.pendingAction === "delete"
                ? `"${redisKey}" will be permanently deleted. This cannot be undone.`
                : hk.pendingAction === "binary_overwrite"
                  ? "This key contains binary data. Overwriting as text may corrupt the original bytes. This cannot be undone."
                  : hk.pendingAction === "force_rename"
                    ? `Key "${hk.keyName.trim()}" already exists. Force overwrite?`
                    : "This will replace the current value. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void hk.handleConfirm()}>
              {hk.pendingAction === "delete"
                ? "Delete"
                : hk.pendingAction === "force_rename"
                  ? "Force overwrite"
                  : "Overwrite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
