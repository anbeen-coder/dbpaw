import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RedisXPendingEntry } from "@/services/api";

export function CreateGroupDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (name: string, startId: string, mkstream: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [startId, setStartId] = useState("0");
  const [mkstream, setMkstream] = useState(false);

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Consumer Group</DialogTitle>
          <DialogDescription>
            Create a new consumer group for this stream.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Group Name</Label>
            <Input
              className="h-8 font-mono text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-group"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start ID</Label>
            <Select value={startId} onValueChange={setStartId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  0 — Process all entries from the beginning
                </SelectItem>
                <SelectItem value="$">
                  $ — Only new entries from now on
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={mkstream}
              onChange={(e) => setMkstream(e.target.checked)}
            />
            MKSTREAM (create stream if it doesn't exist)
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => onConfirm(name.trim(), startId, mkstream)}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResetGroupDialog({
  groupName,
  onClose,
  onConfirm,
}: {
  groupName: string;
  onClose: () => void;
  onConfirm: (startId: string) => void;
}) {
  const [startId, setStartId] = useState("0");

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Group Cursor</DialogTitle>
          <DialogDescription>
            Reset the last delivered ID for group{" "}
            <span className="font-mono font-semibold">{groupName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs">New Start ID</Label>
          <Select value={startId} onValueChange={setStartId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 — Reprocess from beginning</SelectItem>
              <SelectItem value="$">$ — Skip to latest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(startId)}>
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TrimDialog({
  currentLength,
  onClose,
  onConfirm,
}: {
  currentLength: number;
  onClose: () => void;
  onConfirm: (strategy: string, threshold: string) => void;
}) {
  const [strategy, setStrategy] = useState("MAXLEN");
  const [threshold, setThreshold] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trim Stream</DialogTitle>
          <DialogDescription>
            Current length:{" "}
            <span className="font-mono">{currentLength.toLocaleString()}</span>{" "}
            entries. Uses approximate trimming (~) for better performance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAXLEN">
                  MAXLEN — Keep at most N entries
                </SelectItem>
                <SelectItem value="MINID">
                  MINID — Remove entries with ID below threshold
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {strategy === "MAXLEN" ? "Max length" : "Min ID"}
            </Label>
            <Input
              className="h-8 font-mono text-xs"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={strategy === "MAXLEN" ? "1000" : "1234567890-0"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!threshold.trim()}
            onClick={() => onConfirm(strategy, threshold.trim())}
          >
            Trim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClaimDialog({
  entry,
  onClose,
  onConfirm,
}: {
  entry: RedisXPendingEntry;
  onClose: () => void;
  onConfirm: (consumer: string) => void;
}) {
  const [consumer, setConsumer] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Entry</DialogTitle>
          <DialogDescription>
            Transfer entry <span className="font-mono">{entry.id}</span> from{" "}
            <span className="font-mono">{entry.consumer}</span> to a new
            consumer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs">Target Consumer Name</Label>
          <Input
            className="h-8 font-mono text-xs"
            value={consumer}
            onChange={(e) => setConsumer(e.target.value)}
            placeholder="new-consumer"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!consumer.trim()}
            onClick={() => onConfirm(consumer.trim())}
          >
            Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
