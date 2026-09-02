import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactReader, ReactReaderStyle } from "react-reader";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { X, Minus, Plus, Loader2, Maximize, Minimize } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bookData, setBookData] = useState(null);
  const [location, setLocation] = useState(null);
  const [fontSize, setFontSize] = useState(100);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const renditionRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
      if (!book) return;

      // Download raw bytes rather than a signed URL: epub.js detects a real
      // .epub file by checking the URL string literally ends in ".epub",
      // which a signed URL's "?token=..." suffix breaks, making it wrongly
      // assume the URL is an already-unzipped folder.
      const { data: fileBlob } = await supabase.storage.from("books").download(book.storage_path);

      const { data: progress } = await supabase
        .from("reading_progress")
        .select("location")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (!cancelled) {
        setBookData(fileBlob ? await fileBlob.arrayBuffer() : null);
        setLocation(progress?.location || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId, user]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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

  const goToChapter = (href) => {
    renditionRef.current?.display(href);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bookData) {
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
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4">
        <button
          onClick={() => navigate("/library")}
          className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {toc.length > 0 && (
          <Select onValueChange={goToChapter}>
            <SelectTrigger className="max-w-[45%] flex-1 sm:max-w-xs">
              <SelectValue placeholder="Chapters" />
            </SelectTrigger>
            <SelectContent>
              {toc.map((item, i) => (
                <SelectItem key={item.href || i} value={item.href}>{item.label?.trim() || `Chapter ${i + 1}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => applyFontSize(Math.max(70, fontSize - 10))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Decrease font size"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="hidden w-10 text-center text-xs text-muted-foreground sm:inline">{fontSize}%</span>
          <button
            onClick={() => applyFontSize(Math.min(180, fontSize + 10))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Increase font size"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="relative" style={{ height: "calc(100vh - 3.5rem)" }}>
        <ReactReader
          url={bookData}
          location={location}
          locationChanged={handleLocationChanged}
          showToc={false}
          tocChanged={setToc}
          getRendition={(rendition) => {
            renditionRef.current = rendition;
            rendition.themes.fontSize(`${fontSize}%`);
          }}
          epubOptions={{ flow: "paginated" }}
          readerStyles={{
            ...ReactReaderStyle,
            container: { ...ReactReaderStyle.container, backgroundColor: "transparent" },
            readerArea: { ...ReactReaderStyle.readerArea, backgroundColor: "transparent" },
          }}
        />
      </div>
    </div>
  );
}
