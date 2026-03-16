import { useState, useEffect, useCallback } from "react";
import { checkForUpdate, type UpdateInfo } from "@/lib/update-checker";

export function useUpdateChecker() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(() => {
    setChecking(true);
    checkForUpdate()
      .then(setUpdate)
      .finally(() => setChecking(false));
  }, []);

  // Check once on mount
  useEffect(() => { check(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { update, checking, check };
}
