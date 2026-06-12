import { useState } from "react";
import { parseRedisZSetScore } from "../../../redis-utils";
import { errorMessage } from "@/lib/errors";

interface ZSetMember {
  member: string;
  score: number;
}

export function useZSetEditing(
  value: ZSetMember[],
  onChange: (v: ZSetMember[]) => void,
) {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState("");
  const [showNewRow, setShowNewRow] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [newScore, setNewScore] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);

  const commitEdit = (member: string) => {
    let score: number;
    try {
      score = parseRedisZSetScore(editingScore);
    } catch (e) {
      setScoreError(errorMessage(e));
      return;
    }
    onChange(value.map((m) => (m.member === member ? { member, score } : m)));
    setEditingMember(null);
    setScoreError(null);
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setScoreError(null);
  };

  const deleteMember = (member: string) => {
    onChange(value.filter((m) => m.member !== member));
    if (editingMember === member) setEditingMember(null);
  };

  const commitAdd = () => {
    const m = newMember.trim();
    if (!m) return;
    let score: number;
    try {
      score = parseRedisZSetScore(newScore);
    } catch (e) {
      setScoreError(errorMessage(e));
      return;
    }
    const existing = value.findIndex((item) => item.member === m);
    if (existing >= 0) {
      const next = [...value];
      next[existing] = { member: m, score };
      onChange(next);
    } else {
      onChange([...value, { member: m, score }]);
    }
    setNewMember("");
    setNewScore("");
    setShowNewRow(false);
    setScoreError(null);
  };

  const cancelAdd = () => {
    setShowNewRow(false);
    setNewMember("");
    setNewScore("");
    setScoreError(null);
  };

  return {
    editingMember,
    editingScore,
    showNewRow,
    newMember,
    newScore,
    scoreError,
    setEditingMember,
    setEditingScore,
    setShowNewRow,
    setNewMember,
    setNewScore,
    setScoreError,
    commitEdit,
    cancelEdit,
    commitAdd,
    cancelAdd,
    deleteMember,
  };
}
