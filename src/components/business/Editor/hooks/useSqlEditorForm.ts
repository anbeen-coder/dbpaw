import { useState, useCallback } from "react";

export function useSqlEditorForm(props: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const { value, onChange } = props;
  const [internalSql, setInternalSql] = useState("");
  const code = value !== undefined ? value : internalSql;

  const handleSqlChange = useCallback(
    (val: string) => {
      if (value === undefined) {
        setInternalSql(val);
      }

      onChange?.(val);
    },
    [onChange, value],
  );

  return { code, handleSqlChange };
}
