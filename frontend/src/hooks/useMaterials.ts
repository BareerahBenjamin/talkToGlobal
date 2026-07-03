import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Material {
  id: string;
  user_id: string;
  type: "text" | "file" | "url";
  title: string | null;
  content: string | null;
  file_path: string | null;
  file_type: string | null;
  created_at: string;
}

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchMaterials = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setMaterials(data ?? []);
  }, []);

  const addTextMaterial = useCallback(
    async (title: string, content: string, type: "text" | "url" = "text") => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          type,
          title,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      setMaterials((prev) => [data, ...prev]);
      return data;
    },
    [],
  );

  const uploadFile = useCallback(async (file: File) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Read file content for text-based files
      let textContent: string | null = null;
      if (["txt", "md", "markdown"].includes(ext)) {
        textContent = await file.text();
      }

      // Save metadata to DB
      const { data, error: dbError } = await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          type: "file",
          title: file.name,
          content: textContent,
          file_path: filePath,
          file_type: ext,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setMaterials((prev) => [data, ...prev]);
      return data;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteMaterial = useCallback(
    async (id: string) => {
      const material = materials.find((m) => m.id === id);

      // Delete from storage if it's a file
      if (material?.file_path) {
        await supabase.storage.from("materials").remove([material.file_path]);
      }

      await supabase.from("materials").delete().eq("id", id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    },
    [materials],
  );

  return {
    materials,
    uploading,
    fetchMaterials,
    addTextMaterial,
    uploadFile,
    deleteMaterial,
  };
}
