import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { BookOpen, Upload, Trash2, Loader2 } from "lucide-react";

function BookCard({ book, onDelete }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft transition-transform hover:-translate-y-1">
      <Link to={`/reader/${book.id}`} className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-24 w-16 items-center justify-center rounded-md bg-gradient-to-br from-primary/25 to-accent/20 shadow-sm">
          <BookOpen className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-heading text-sm font-medium leading-snug">{book.title}</p>
          {book.author && <p className="mt-1 text-xs text-muted-foreground">{book.author}</p>}
        </div>
      </Link>
      {onDelete && (
        <button
          onClick={() => onDelete(book)}
          className="absolute right-2 top-2 rounded-lg bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadBooks = () => {
    if (!user) return;
    supabase
      .from("books")
      .select("*")
      .then(({ data }) => setBooks(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(loadBooks, [user]);

  const myBooks = books.filter((b) => !b.is_library);
  const libraryBooks = books.filter((b) => b.is_library);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".epub")) {
      alert("Please choose an .epub file.");
      return;
    }
    setUploading(true);
    const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("books").upload(storagePath, file, {
      contentType: "application/epub+zip",
    });
    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }
    const title = file.name.replace(/\.epub$/i, "");
    const { data, error } = await supabase
      .from("books")
      .insert({ user_id: user.id, title, storage_path: storagePath, is_library: false })
      .select()
      .single();
    setUploading(false);
    if (!error && data) {
      setBooks((prev) => [...prev, data]);
    }
    e.target.value = "";
  };

  const handleDelete = async (book) => {
    await supabase.storage.from("books").remove([book.storage_path]);
    await supabase.from("books").delete().eq("id", book.id);
    setBooks((prev) => prev.filter((b) => b.id !== book.id));
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl md:text-5xl font-medium">Library</h1>
          <p className="mt-2 text-muted-foreground">Your books, and a few classics to get you started.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload EPUB
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-4 font-heading text-xl font-medium">Your Books</h2>
            {myBooks.length === 0 ? (
              <p className="rounded-2xl bg-card p-8 text-center text-sm italic text-muted-foreground shadow-soft">
                Nothing uploaded yet — add an EPUB above to start reading. 📖
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {myBooks.map((b) => <BookCard key={b.id} book={b} onDelete={handleDelete} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-heading text-xl font-medium">Classics</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {libraryBooks.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
