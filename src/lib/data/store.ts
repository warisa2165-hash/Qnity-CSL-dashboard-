/**
 * JSON file store
 * ===============
 *
 * Persists edits to plain JSON files so the portal can be operated without a
 * database. The mock dataset stays the immutable baseline; once a collection
 * has been edited, its JSON file becomes the source of truth for that
 * collection.
 *
 * Where the files live
 * --------------------
 * Preferred: `data/` at the repository root — visible, diffable, committable.
 * If that directory cannot be written (a read-only deployment filesystem such
 * as Vercel's), the store falls back to the OS temp directory so the app
 * keeps working, and reports `durable: false` so the UI can say plainly that
 * edits will not survive.
 *
 * Files are small and read per request. No caching layer: a stale dashboard
 * after saving would be a worse bug than the few milliseconds saved.
 */

import { promises as fs } from "node:fs";
import { existsSync, accessSync, constants, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type Collection =
  | "project"
  | "milestones"
  | "risks"
  | "actions"
  | "procurement";

export interface StoreLocation {
  dir: string;
  /** False when writes go to a temp directory that the host will discard. */
  durable: boolean;
  reason: string;
}

let cachedLocation: StoreLocation | null = null;

/** Resolve — once per process — where edits can actually be written. */
export function storeLocation(): StoreLocation {
  if (cachedLocation) return cachedLocation;

  const repoDir = path.join(process.cwd(), "data");
  try {
    if (!existsSync(repoDir)) mkdirSync(repoDir, { recursive: true });
    accessSync(repoDir, constants.W_OK);
    cachedLocation = {
      dir: repoDir,
      durable: true,
      reason: "Writing to the repository data/ directory.",
    };
    return cachedLocation;
  } catch {
    // Read-only deployment filesystem. Keep working, but be honest about it.
    const tmpDir = path.join(os.tmpdir(), "qnity-csl-data");
    try {
      mkdirSync(tmpDir, { recursive: true });
    } catch {
      /* the read below will simply find nothing */
    }
    cachedLocation = {
      dir: tmpDir,
      durable: false,
      reason:
        "The application directory is read-only, so edits are written to a temporary directory and will be lost when the host recycles this instance.",
    };
    return cachedLocation;
  }
}

const fileFor = (collection: Collection) =>
  path.join(storeLocation().dir, `${collection}.json`);

/**
 * Read a saved collection. Returns null when nothing has been saved yet,
 * which is the signal to fall back to the mock baseline.
 */
export async function readCollection<T>(
  collection: Collection,
): Promise<T | null> {
  try {
    const raw = await fs.readFile(fileFor(collection), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return null;
    // A corrupt or unreadable file must not take the portal down — fall back
    // to the baseline and leave a trace for whoever has to explain it.
    console.error(`[store] could not read ${collection}.json`, error);
    return null;
  }
}

/** Write a collection, replacing whatever was there. */
export async function writeCollection<T>(
  collection: Collection,
  value: T,
): Promise<void> {
  const target = fileFor(collection);
  await fs.mkdir(path.dirname(target), { recursive: true });
  // Write to a sibling then rename, so a crash mid-write cannot leave a
  // half-written file that the next read would reject.
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, target);
}

/** Has this collection been edited? Used by the admin data panel. */
export async function isCustomised(collection: Collection): Promise<boolean> {
  return (await readCollection(collection)) !== null;
}

/** Discard saved edits and return to the mock baseline. */
export async function resetCollection(collection: Collection): Promise<void> {
  try {
    await fs.unlink(fileFor(collection));
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
}
