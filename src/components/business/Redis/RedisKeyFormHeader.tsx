import {
  Clock,
  Hash,
  Loader2,
  MemoryStick,
  RefreshCw,
  Trash2,
  Box,
  Timer,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RedisKeyValue, RedisValue } from "@/services/api";
import type { SetOptions } from "./useRedisKey";
import { formatTtl, formatBytes, formatIdleTime } from "./redis-format";

type RedisKind = RedisValue["kind"];

interface RedisKeyFormHeaderProps {
  isCreateMode: boolean;
  redisKey: string;
  record: RedisKeyValue | null;
  typeBadge: { label: string; className: string } | null;
  database: string;
  keyName: string;
  onKeyNameChange: (v: string) => void;
  valueKind: RedisKind;
  onKindChange: (kind: RedisKind) => void;
  ttl: string;
  onTtlChange: (v: string) => void;
  onApplyTtl: () => void;
  isSaving: boolean;
  valueTotalLen: number | null;
  onRefresh: () => void;
  onDelete: () => void;
  isLoading: boolean;
  setOptions: SetOptions;
  onSetOptionsChange: (patch: Partial<SetOptions>) => void;
}

export function RedisKeyFormHeader({
  isCreateMode,
  redisKey,
  record,
  typeBadge,
  database,
  keyName,
  onKeyNameChange,
  valueKind,
  onKindChange,
  ttl,
  onTtlChange,
  onApplyTtl,
  isSaving,
  valueTotalLen,
  onRefresh,
  onDelete,
  isLoading,
  setOptions,
  onSetOptionsChange,
}: RedisKeyFormHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-xl font-semibold tracking-tight truncate">
            {isCreateMode ? "New Redis key" : redisKey}
          </h2>
          {typeBadge && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${typeBadge.className}`}
            >
              {typeBadge.label}
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isCreateMode || isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isCreateMode}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata bar (view mode only) */}
      {!isCreateMode && record && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted/40 border">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            TTL: {formatTtl(record.ttl)}
          </span>
          {valueTotalLen !== null && valueTotalLen > 0 && (
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              {valueTotalLen.toLocaleString()} total
            </span>
          )}
          {record.objectEncoding && (
            <span className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />
              Enc: {record.objectEncoding}
            </span>
          )}
          {record.memoryUsage != null && record.memoryUsage > 0 && (
            <span className="flex items-center gap-1.5">
              <MemoryStick className="w-3.5 h-3.5" />
              Mem: {formatBytes(record.memoryUsage)}
            </span>
          )}
          {record.objectIdletime != null && record.objectIdletime >= 0 && (
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              Idle: {formatIdleTime(record.objectIdletime)}
            </span>
          )}
          {record.objectRefcount != null && record.objectRefcount > 0 && (
            <span className="flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              Refs: {record.objectRefcount}
            </span>
          )}
          <span className="text-muted-foreground/60">{database}</span>
        </div>
      )}

      {/* Edit form: key name / type / TTL */}
      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[1fr_160px_160px]">
        <div className="space-y-2">
          <Label>Key</Label>
          <Input
            value={keyName}
            onChange={(e) => onKeyNameChange(e.target.value)}
            placeholder="key name"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          {isCreateMode ? (
            <Select
              value={valueKind === "none" ? "string" : valueKind}
              onValueChange={(v) => onKindChange(v as RedisKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="hash">hash</SelectItem>
                <SelectItem value="list">list</SelectItem>
                <SelectItem value="set">set</SelectItem>
                <SelectItem value="zSet">zset</SelectItem>
                <SelectItem value="stream">stream</SelectItem>
                <SelectItem value="json">json</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
              {record?.keyType ?? valueKind}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>TTL (seconds)</Label>
          <div className="flex gap-1.5">
            <Input
              value={ttl}
              onChange={(e) => onTtlChange(e.target.value)}
              placeholder="persist"
              inputMode="numeric"
            />
            {!isCreateMode && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 px-2.5"
                onClick={onApplyTtl}
                disabled={isSaving}
                title="Apply TTL without modifying the value"
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced SET options (String type only, create mode only) */}
      {isCreateMode && valueKind === "string" && (
        <div className="rounded-lg border bg-card">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onSetOptionsChange({ expanded: !setOptions.expanded })}
          >
            <span>Advanced SET options</span>
            <span className="text-[10px]">
              {setOptions.expanded ? "▲" : "▼"}
            </span>
          </button>
          {setOptions.expanded && (
            <div className="grid gap-3 border-t px-4 py-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="set-condition"
                      checked={!setOptions.nx && !setOptions.xx}
                      onChange={() => {
                        onSetOptionsChange({ nx: false, xx: false });
                      }}
                    />
                    None
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="set-condition"
                      checked={setOptions.nx}
                      onChange={() => {
                        onSetOptionsChange({ nx: true, xx: false });
                      }}
                    />
                    NX
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="set-condition"
                      checked={setOptions.xx}
                      onChange={() => {
                        onSetOptionsChange({ nx: false, xx: true });
                      }}
                    />
                    XX
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  NX: set only if absent · XX: set only if exists
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PX (ms expiry)</Label>
                <Input
                  className="h-7 text-xs"
                  value={setOptions.px}
                  onChange={(e) => onSetOptionsChange({ px: e.target.value })}
                  placeholder="disabled"
                  inputMode="numeric"
                  disabled={!!ttl.trim()}
                />
                <p className="text-[10px] text-muted-foreground">
                  Mutually exclusive with TTL (seconds)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="set-keepttl"
                  checked={setOptions.keepttl}
                  onChange={(e) => onSetOptionsChange({ keepttl: e.target.checked })}
                />
                <Label
                  htmlFor="set-keepttl"
                  className="text-xs cursor-pointer"
                >
                  KEEPTTL
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Retain existing TTL
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
