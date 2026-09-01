import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactReader } from "react-reader";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { X, Minus, Plus, Loader2 } from "lucide-react";

export default function ReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [signedUrl, setSignedUrl] = useState(null);
  const [location, setLocation] = useState(null);
  const [fontSize, setFontSize] = useState(100);
  const [loading, setLoading] = useState(true);
  const renditionRef = useRef(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
      if (!book) return;

      const { data: signed } = await supabase.storage.from("books").createSignedUrl(book.storage_path, 3600);

      const { data: progress } = await supabase
        .from("reading_progress")
        .select("location")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (!cancelled) {
        setSignedUrl(signed?.signedUrl || null);
        setLocation(progress?.location || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId, user]);

  const handleLocationChanged = useCallback((cfi) => {
    setLocation(cfi);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      supabase
        .from("reading_progress")
        .upsert(
          { user_id: user.id, book_id: bookId, location: cfi, updated_at: new Date().toISOString() },
          { onConflict: "user_id,book_id" }
        )
        .then(() => {});
    }, 800);
  }, [bookId, user]);

  const applyFontSize = (size) => {
    setFontSize(size);
    renditionRef.current?.themes.fontSize(`${size}%`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Couldn't load this book.</p>
        <button onClick={() => navigate("/library")} className="text-sm text-primary underline">
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <button
          onClick={() => navigate("/library")}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => applyFontSize(Math.max(70, fontSize - 10))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Decrease font size"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs text-muted-foreground">{fontSize}%</span>
          <button
            onClick={() => applyFontSize(Math.min(180, fontSize + 10))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Increase font size"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <ReactReader
          url={signedUrl}
          location={location}
          locationChanged={handleLocationChanged}
          getRendition={(rendition) => {
            renditionRef.current = rendition;
            rendition.themes.fontSize(`${fontSize}%`);
          }}
          epubOptions={{ flow: "paginated" }}
          readerStyles={{
            container: { backgroundColor: "transparent" },
            reader: { backgroundColor: "transparent" },
          }}
        />
      </div>
    </div>
  );
}
