// One-time script to seed the shared "Classics" library.
// Run locally with: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-library.cjs
// Never commit the service-role key or add it to .env — it bypasses RLS.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BOOKS = [
  { file: "pride-and-prejudice.epub", title: "Pride and Prejudice", author: "Jane Austen" },
  { file: "alice-in-wonderland.epub", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" },
  { file: "frankenstein.epub", title: "Frankenstein", author: "Mary Shelley" },
  { file: "sherlock-holmes.epub", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle" },
  { file: "dracula.epub", title: "Dracula", author: "Bram Stoker" },
];

(async () => {
  for (const book of BOOKS) {
    const filePath = path.join(__dirname, "..", "seed-books", book.file);
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `library/${book.file}`;

    const { error: uploadError } = await supabase.storage
      .from("books")
      .upload(storagePath, fileBuffer, { contentType: "application/epub+zip", upsert: true });

    if (uploadError) {
      console.error(`Failed to upload ${book.file}:`, uploadError.message);
      continue;
    }

    const { error: insertError } = await supabase
      .from("books")
      .upsert(
        { title: book.title, author: book.author, storage_path: storagePath, is_library: true, user_id: null },
        { onConflict: "storage_path" }
      );

    if (insertError) {
      console.error(`Failed to insert row for ${book.title}:`, insertError.message);
      continue;
    }

    console.log(`Seeded: ${book.title}`);
  }
})();
