import { useState } from "react";

export function useZSetRankScore(
  onZRank?: (member: string, reverse: boolean) => Promise<number | null>,
  onZScore?: (member: string) => Promise<number | null>,
  onZMScore?: (members: string[]) => Promise<(number | null)[]>,
) {
  const [rankMember, setRankMember] = useState("");
  const [rankResult, setRankResult] = useState<{
    rank: number;
    reverse: boolean;
  } | null>(null);
  const [isRanking, setIsRanking] = useState(false);

  const [scoreMember, setScoreMember] = useState("");
  const [scoreResult, setScoreResult] = useState<{
    value: (number | null)[];
    members: string[];
  } | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const handleRankLookup = async (reverse: boolean) => {
    if (!onZRank || !rankMember.trim()) return;
    setIsRanking(true);
    try {
      const rank = await onZRank(rankMember.trim(), reverse);
      setRankResult(rank !== null ? { rank, reverse } : null);
    } catch {
      setRankResult(null);
    } finally {
      setIsRanking(false);
    }
  };

  const handleScoreLookup = async (multi: boolean) => {
    const raw = scoreMember.trim();
    if (!raw) return;
    const members = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (members.length === 0) return;
    setIsScoring(true);
    try {
      if (multi && onZMScore) {
        const scores = await onZMScore(members);
        setScoreResult({ value: scores, members });
      } else if (onZScore) {
        const score = await onZScore(members[0]);
        setScoreResult({
          value: [score],
          members: [members[0]],
        });
      }
    } catch {
      setScoreResult(null);
    } finally {
      setIsScoring(false);
    }
  };

  return {
    rankMember,
    rankResult,
    isRanking,
    scoreMember,
    scoreResult,
    isScoring,
    setRankMember,
    setRankResult,
    setIsRanking,
    setScoreMember,
    setScoreResult,
    setIsScoring,
    handleRankLookup,
    handleScoreLookup,
  };
}
