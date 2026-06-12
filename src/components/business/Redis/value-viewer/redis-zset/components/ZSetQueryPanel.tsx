import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useZSetRangeQuery } from "../hooks/useZSetRangeQuery";
import type { useZSetRankScore } from "../hooks/useZSetRankScore";
import type { useZSetLexRange } from "../hooks/useZSetLexRange";

interface ZSetQueryPanelProps {
  rangeQuery: ReturnType<typeof useZSetRangeQuery> & { hasCapability: boolean };
  rankScore: ReturnType<typeof useZSetRankScore> & {
    hasRankCapability: boolean;
    hasScoreCapability: boolean;
    onZScore?: (member: string) => Promise<number | null>;
    onZMScore?: (members: string[]) => Promise<(number | null)[]>;
  };
  lexRange: ReturnType<typeof useZSetLexRange> & { hasCapability: boolean };
}

export function ZSetQueryPanel({
  rangeQuery,
  rankScore,
  lexRange,
}: ZSetQueryPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      {/* Score Range Filter */}
      {rangeQuery.hasCapability && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t("redis.zset.scoreRange")}
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="h-7 font-mono text-xs w-28"
              value={rangeQuery.filterMin}
              onChange={(e) => rangeQuery.setFilterMin(e.target.value)}
              placeholder="-inf"
            />
            <span className="text-xs text-muted-foreground">~</span>
            <Input
              className="h-7 font-mono text-xs w-28"
              value={rangeQuery.filterMax}
              onChange={(e) => rangeQuery.setFilterMax(e.target.value)}
              placeholder="+inf"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => void rangeQuery.handleFilter()}
              disabled={rangeQuery.isFiltering}
            >
              {rangeQuery.isFiltering ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : null}
              {t("redis.zset.filter")}
            </Button>
            {rangeQuery.filterActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={rangeQuery.clearFilter}
              >
                <X className="w-3 h-3 mr-1" />
                {t("redis.zset.clear")}
              </Button>
            )}
          </div>
          {rangeQuery.filterActive && rangeQuery.filterTotal !== null && (
            <div className="text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs mr-1.5">
                ZCOUNT: {rangeQuery.filterTotal}
              </Badge>
              {t("redis.zset.scoreRangeSummary", {
                count: rangeQuery.filteredMembers?.length ?? 0,
                min: rangeQuery.filterMin,
                max: rangeQuery.filterMax,
              })}
            </div>
          )}
        </div>
      )}

      {/* Rank Lookup */}
      {rankScore.hasRankCapability && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t("redis.zset.memberRank")}
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="h-7 font-mono text-xs w-48"
              value={rankScore.rankMember}
              onChange={(e) => {
                rankScore.setRankMember(e.target.value);
                rankScore.setRankResult(null);
              }}
              placeholder={t("redis.zset.memberNamePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") void rankScore.handleRankLookup(false);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => void rankScore.handleRankLookup(false)}
              disabled={rankScore.isRanking || !rankScore.rankMember.trim()}
            >
              {rankScore.isRanking ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : null}
              ZRANK
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => void rankScore.handleRankLookup(true)}
              disabled={rankScore.isRanking || !rankScore.rankMember.trim()}
            >
              {rankScore.isRanking ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : null}
              ZREVRANK
            </Button>
          </div>
          {rankScore.rankResult !== null && (
            <div className="text-xs">
              <Badge variant="secondary" className="text-xs mr-1.5">
                {rankScore.rankResult.reverse ? "ZREVRANK" : "ZRANK"}
              </Badge>
              <span className="text-muted-foreground">
                {t("redis.zset.rankLabel")}{" "}
                <span className="font-mono text-foreground">
                  #{rankScore.rankResult.rank}
                </span>
              </span>
            </div>
          )}
          {rankScore.rankResult === null &&
            rankScore.rankMember.trim() &&
            !rankScore.isRanking && (
              <div className="text-xs text-muted-foreground">
                {t("redis.zset.memberNotFound")}
              </div>
            )}
        </div>
      )}

      {/* Score Lookup (ZSCORE / ZMSCORE) */}
      {rankScore.hasScoreCapability && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t("redis.zset.scoreLookup")}
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="h-7 font-mono text-xs w-48"
              value={rankScore.scoreMember}
              onChange={(e) => {
                rankScore.setScoreMember(e.target.value);
                rankScore.setScoreResult(null);
              }}
              placeholder={t("redis.zset.scoreLookupPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") void rankScore.handleScoreLookup(false);
              }}
            />
            {rankScore.onZScore && (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => void rankScore.handleScoreLookup(false)}
                disabled={rankScore.isScoring || !rankScore.scoreMember.trim()}
              >
                {rankScore.isScoring ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : null}
                ZSCORE
              </Button>
            )}
            {rankScore.onZMScore && (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => void rankScore.handleScoreLookup(true)}
                disabled={rankScore.isScoring || !rankScore.scoreMember.trim()}
              >
                {rankScore.isScoring ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : null}
                ZMSCORE
              </Button>
            )}
          </div>
          {rankScore.scoreResult && (
            <div className="text-xs space-y-0.5">
              {rankScore.scoreResult.members.map((m, i) => (
                <div key={m} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {m}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  {rankScore.scoreResult!.value[i] !== null ? (
                    <span className="font-mono text-foreground">
                      {rankScore.scoreResult!.value[i]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">(nil)</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {rankScore.scoreResult === null &&
            rankScore.scoreMember.trim() &&
            !rankScore.isScoring && (
              <div className="text-xs text-muted-foreground">
                {t("redis.zset.memberNotFound")}
              </div>
            )}
        </div>
      )}

      {/* Lex Range (ZRANGEBYLEX) */}
      {lexRange.hasCapability && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t("redis.zset.lexRange")}{" "}
            <span className="text-muted-foreground/60 font-normal">
              {t("redis.zset.lexRangeHint")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="h-7 font-mono text-xs w-28"
              value={lexRange.lexMin}
              onChange={(e) => lexRange.setLexMin(e.target.value)}
              placeholder="-"
            />
            <span className="text-xs text-muted-foreground">~</span>
            <Input
              className="h-7 font-mono text-xs w-28"
              value={lexRange.lexMax}
              onChange={(e) => lexRange.setLexMax(e.target.value)}
              placeholder="+"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => void lexRange.handleLexRange()}
              disabled={lexRange.isLexing}
            >
              {lexRange.isLexing ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : null}
              ZRANGEBYLEX
            </Button>
            {lexRange.lexActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={lexRange.clearLex}
              >
                <X className="w-3 h-3 mr-1" />
                {t("redis.zset.clear")}
              </Button>
            )}
          </div>
          {lexRange.lexActive && lexRange.lexTotal !== null && (
            <div className="text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs mr-1.5">
                ZLEXCOUNT: {lexRange.lexTotal}
              </Badge>
              {t("redis.zset.lexRangeSummary", {
                count: lexRange.lexMembers?.length ?? 0,
                min: lexRange.lexMin,
                max: lexRange.lexMax,
              })}
            </div>
          )}
          {lexRange.lexActive &&
            lexRange.lexMembers &&
            lexRange.lexMembers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lexRange.lexMembers.map((m) => (
                  <Badge
                    key={m}
                    variant="outline"
                    className="text-xs font-mono"
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
