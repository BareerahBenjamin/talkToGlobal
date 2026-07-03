import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { extractDna, type DnaData } from "@/lib/api";

interface DnaRecord extends DnaData {
  id: string;
  user_id: string;
  language_style: string;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export function useDna() {
  const [dna, setDna] = useState<DnaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDna = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("founder_dna")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      setError(fetchError.message);
    } else {
      setDna(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDna();
  }, [fetchDna]);

  const generateFromInterview = useCallback(
    async (interviewId: string, materialIds?: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await extractDna({
          interview_id: interviewId,
          material_ids: materialIds,
        });
        await fetchDna(); // Re-fetch from DB
        return result;
      } catch (err) {
        setError(String(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchDna],
  );

  const updateDna = useCallback(
    async (
      updates: Partial<
        DnaData & { language_style: string; is_confirmed: boolean }
      >,
    ) => {
      if (!dna) return;

      const { error: updateError } = await supabase
        .from("founder_dna")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", dna.id);

      if (updateError) {
        setError(updateError.message);
        throw updateError;
      }

      await fetchDna();
    },
    [dna, fetchDna],
  );

  return {
    dna,
    loading,
    error,
    generateFromInterview,
    updateDna,
    refetch: fetchDna,
  };
}
