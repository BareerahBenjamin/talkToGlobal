import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  generateZh,
  generateEn,
  type ZhVersion,
  type EnVersion,
} from "@/lib/api";

export interface Content {
  id: string;
  user_id: string;
  source_type: string | null;
  source_input: string | null;
  dna_snapshot: unknown;
  zh_versions: ZhVersion[] | null;
  selected_zh_index: number | null;
  edited_zh_text: string | null;
  en_versions: EnVersion[] | null;
  status: "draft" | "published" | "archived";
  dna_tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useContents(filter?: { status?: string; q?: string }) {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContents = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setContents([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("contents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "All") {
      query = query.eq("status", filter.status.toLowerCase());
    }

    if (filter?.q) {
      query = query.or(
        `source_input.ilike.%${filter.q}%,edited_zh_text.ilike.%${filter.q}%`,
      );
    }

    const { data } = await query;
    setContents(data ?? []);
    setLoading(false);
  }, [filter?.status, filter?.q]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return { contents, loading, refetch: fetchContents };
}

export function useContentGeneration() {
  const [generating, setGenerating] = useState(false);
  const [zhVersions, setZhVersions] = useState<ZhVersion[]>([]);
  const [enVersions, setEnVersions] = useState<EnVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateChinese = useCallback(
    async (input: string, sourceType: string, dnaId?: string) => {
      setGenerating(true);
      setError(null);
      try {
        const result = await generateZh({
          source_input: input,
          source_type: sourceType,
          dna_id: dnaId,
        });
        setZhVersions(result.versions);
        return result.versions;
      } catch (err) {
        setError(String(err));
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  const generateEnglish = useCallback(
    async (
      zhText: string,
      dnaId?: string,
      sourceType?: string,
      platforms = ["x", "linkedin"],
    ) => {
      setGenerating(true);
      setError(null);
      try {
        const result = await generateEn({
          zh_text: zhText,
          dna_id: dnaId,
          source_type: sourceType,
          platforms,
        });
        setEnVersions(result.versions);
        return result.versions;
      } catch (err) {
        setError(String(err));
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  const saveContent = useCallback(async (content: Partial<Content>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error: saveError } = await supabase
      .from("contents")
      .insert({ ...content, user_id: user.id })
      .select()
      .single();

    if (saveError) throw saveError;
    return data;
  }, []);

  const updateContent = useCallback(
    async (id: string, updates: Partial<Content>) => {
      const { data, error: updateError } = await supabase
        .from("contents")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    [],
  );

  return {
    generating,
    zhVersions,
    enVersions,
    error,
    generateChinese,
    generateEnglish,
    saveContent,
    updateContent,
  };
}
