import { supabase } from "@/integrations/supabase/client";

const BUCKET = "story-assets";

function extOf(file: File) {
  const m = file.name.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] || "bin").toLowerCase();
}

async function uploadAt(path: string, file: File) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // cache-bust to avoid stale CDN previews while editing
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function uploadCover(storyId: string, file: File) {
  return uploadAt(`${storyId}/cover.${extOf(file)}`, file);
}
export function uploadPageImage(storyId: string, pageIndex: number, file: File) {
  return uploadAt(`${storyId}/page-${pageIndex}.${extOf(file)}`, file);
}
export function uploadPageAudio(storyId: string, pageIndex: number, file: File) {
  return uploadAt(`${storyId}/page-${pageIndex}-audio.${extOf(file)}`, file);
}
export function uploadSoundtrack(storyId: string, file: File) {
  return uploadAt(`${storyId}/soundtrack.${extOf(file)}`, file);
}

export async function deleteStoryFolder(storyId: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(storyId);
  if (error) return;
  if (!data?.length) return;
  await supabase.storage
    .from(BUCKET)
    .remove(data.map((o) => `${storyId}/${o.name}`));
}
