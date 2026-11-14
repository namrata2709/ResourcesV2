/**
 * TypeBadges — one small badge per unique file type present in a note's
 * `files` array. Generic over the files array AND the icon-lookup map —
 * not hardcoded to notes' three current types (notes/lab/slides).
 *
 * This is exactly why the underlying `files` schema being generic
 * already (per this ticket's own confirmation) matters: TypeBadges just
 * renders whatever unique `type` values show up, falling back to each
 * file's own `icon` field if the type isn't in the provided map — so a
 * brand-new future file type (a PDF, a shared doc, a code-reference
 * folder) shows up correctly with zero code change here, as long as the
 * data itself provides SOME icon/label.
 */

export interface FileLike {
  type: string;
  icon?: string;
  name?: string;
}

export interface TypeMeta {
  icon: string;
  label: string;
}

interface TypeBadgesProps {
  files: FileLike[];
  /** Known type -> {icon, label}. Anything not in here falls back to the file's own `icon`/`type` as the label. */
  typeMap?: Record<string, TypeMeta>;
  className?: string;
}

export function TypeBadges({ files, typeMap = {}, className = '' }: TypeBadgesProps) {
  if (!files || files.length === 0) return null;

  const seen = new Map<string, TypeMeta>();
  for (const file of files) {
    if (seen.has(file.type)) continue;
    const known = typeMap[file.type];
    seen.set(file.type, known ?? { icon: file.icon || '📎', label: file.type });
  }

  return (
    <div className={`type-badge-row flex gap-1 ${className}`}>
      {Array.from(seen.entries()).map(([type, meta]) => (
        <span
          key={type}
          className="type-badge inline-flex items-center justify-center h-6 w-6 rounded-full bg-bg-secondary text-sm"
          title={meta.label}
          aria-label={meta.label}
        >
          <span aria-hidden="true">{meta.icon}</span>
        </span>
      ))}
    </div>
  );
}
