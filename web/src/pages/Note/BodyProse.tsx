/**
 * pages/Note/BodyProse.tsx — T5-3a: renders body-prose.json's structured
 * blocks (headings, callouts, collapsibles, references, takeaways,
 * YouTube embeds, inline images) in place of Note.tsx's old placeholder.
 * `<code-tabs>` and raw injected HTML are deliberately no-ops here (see
 * BodyProseCodeTabsRawBlock/BodyProseRawHtmlBlock in types.ts) — that
 * content belongs to T5-3b/DSA-specific modules, not this ticket.
 *
 * `folder` is threaded through purely to resolve `[image:...]` blocks'
 * relative filenames against the note's own `images/` directory
 * (confirmed path shape: generate_notes.py writes `images/{filename}`
 * relative to the note's output dir — see `expand_inline_images()`).
 */

import { useState } from 'react';
import { ExternalLink, Info, AlertTriangle, AlertCircle, PlayCircle, Link2, NotebookPen, StickyNote } from 'lucide-react';
import { dataPath } from '../../lib/siteConfig';
import { BookmarkStar } from './BookmarkStar';
import { highlightRuns } from './highlightRuns';
import { HighlightNoteEditor } from './HighlightNoteEditor';
import { useHighlightsForBlock } from './HighlightsContext';
import type { BodyProseBlock, BodyProseRun } from './types';

/** Plain-text label for a run list -- used only for BookmarkStar's
 * accessible name, never stored (see bookmarks.ts's own note on why
 * labels aren't persisted). */
function runsToText(runs: BodyProseRun[]): string {
  return runs.map((run) => run.text).join('');
}

/** Renders a single run's content, applying its `mark`-based styling.
 * Extracted from `Runs` so `HighlightedRuns` below can wrap the SAME
 * per-mark rendering in a `<mark>` for highlighted segments, instead of
 * duplicating the switch statement. */
function renderRunContent(run: BodyProseRun, key: number | string) {
  switch (run.mark) {
    case 'code':
      return (
        <code key={key} className="rounded bg-bg-secondary px-1 py-0.5 text-[0.9em] font-mono">
          {run.text}
        </code>
      );
    case 'kbd':
      return (
        <kbd
          key={key}
          className="rounded border border-border-color bg-bg-secondary px-1.5 py-0.5 text-xs font-mono shadow-sm"
        >
          {run.text}
        </kbd>
      );
    case 'link':
      return (
        <a
          key={key}
          href={run.url}
          className="text-primary underline hover:text-accent"
          {...(run.url?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {run.text}
        </a>
      );
    case 'bold':
      return <strong key={key}>{run.text}</strong>;
    case 'underline':
      return (
        <span key={key} className="underline">
          {run.text}
        </span>
      );
    case 'italic':
      return <em key={key}>{run.text}</em>;
    case 'strike':
      return (
        <span key={key} className="line-through">
          {run.text}
        </span>
      );
    case 'highlight':
      return (
        <mark key={key} className="rounded bg-accent/20 px-0.5 text-text-primary">
          {run.text}
        </mark>
      );
    case 'sup':
      return <sup key={key}>{run.text}</sup>;
    case 'sub':
      return <sub key={key}>{run.text}</sub>;
    case 'small':
      return (
        <span key={key} className="text-xs text-text-muted">
          {run.text}
        </span>
      );
    case 'examTerm':
      // Marker class (`exam-term`) intentionally left for a future
      // exam-mode ticket (T5-3c+) to hook visibility/styling off
      // `data-exam-mode` -- this ticket only needs the term visibly
      // distinguished, not the toggle behavior itself.
      return (
        <span key={key} className="exam-term rounded bg-accent/10 px-1 font-semibold text-accent">
          {run.text}
        </span>
      );
    case 'examSentence':
      return (
        <span key={key} className="exam-sentence rounded bg-accent/10 px-1">
          {run.text}
        </span>
      );
    default:
      return <span key={key}>{run.text}</span>;
  }
}

function Runs({ runs }: { runs: BodyProseRun[] }) {
  return <>{runs.map((run, i) => renderRunContent(run, i))}</>;
}

/**
 * P1-1: same as `Runs`, but first splits `runs` at any saved highlight
 * boundaries for this block (see ./highlightRuns.ts), then wraps each
 * highlighted segment in a real `<mark>` on top of whatever styling
 * that segment already had -- clicking it removes the highlight. Used
 * everywhere a paragraph/callout/takeaways item renders selectable
 * prose; NOT used for headings/table cells/list items (P1-1's own scope
 * is body prose, and those already carry their own semantics a
 * highlight wrapper would clutter -- P1-1's follow-up tickets can widen
 * this if that's ever wanted).
 *
 * P1-2: each highlight also gets a small note-icon button, rendered
 * once per highlight (on that highlight's FIRST rendered segment only
 * -- a highlight spanning multiple differently-styled runs produces
 * several `<mark>` segments sharing one `highlightId`, per
 * highlightRuns.ts's own doc comment, and a repeated icon on every
 * segment would be visual noise for one logical note). Deliberately a
 * SEPARATE clickable element from the `<mark>` itself, with its own
 * `stopPropagation` -- P1-1 already wired clicking the mark to remove
 * the highlight outright, and this ticket doesn't change that shipped
 * behavior; adding a note is an intentionally distinct action from
 * removing one.
 */
function HighlightedRuns({ runs, blockId }: { runs: BodyProseRun[]; blockId?: string }) {
  const { highlights, onRemove, onEditNote } = useHighlightsForBlock(blockId);
  const [noteEditor, setNoteEditor] = useState<{ id: string; top: number; left: number } | null>(null);

  if (!highlights.length) return <Runs runs={runs} />;

  const segments = highlightRuns(
    runs,
    highlights.map((h) => ({ id: h.id, text: h.text }))
  );

  const seenHighlightIds = new Set<string>();
  const activeHighlight = noteEditor ? highlights.find((h) => h.id === noteEditor.id) : undefined;

  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.highlightId) return renderRunContent(seg, i);
        const highlightId = seg.highlightId;
        const isFirstSegment = !seenHighlightIds.has(highlightId);
        seenHighlightIds.add(highlightId);
        const highlight = highlights.find((h) => h.id === highlightId);

        return (
          <mark
            key={i}
            data-highlight-id={highlightId}
            role="button"
            tabIndex={0}
            title="Click to remove highlight"
            className="cursor-pointer rounded bg-yellow-200/70 px-0.5 text-text-primary hover:bg-yellow-300/80 dark:bg-yellow-500/30 dark:hover:bg-yellow-500/40"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(highlightId);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRemove(highlightId);
              }
            }}
          >
            {renderRunContent({ ...seg, mark: seg.mark }, `inner-${i}`)}
            {isFirstSegment && (
              <button
                type="button"
                data-note-trigger-id={highlightId}
                aria-label={highlight?.note ? 'Edit note' : 'Add note'}
                title={highlight?.note ? 'Edit note' : 'Add note'}
                className="ml-0.5 inline-flex align-text-top text-text-primary/60 hover:text-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setNoteEditor({ id: highlightId, top: rect.bottom + 4, left: rect.left });
                }}
              >
                {highlight?.note ? (
                  <StickyNote size={12} aria-hidden="true" />
                ) : (
                  <NotebookPen size={12} aria-hidden="true" />
                )}
              </button>
            )}
          </mark>
        );
      })}
      {noteEditor && activeHighlight && (
        <HighlightNoteEditor
          top={noteEditor.top}
          left={noteEditor.left}
          initialNote={activeHighlight.note ?? ''}
          onSave={(note) => onEditNote(activeHighlight.id, note)}
          onRemoveHighlight={() => {
            onRemove(activeHighlight.id);
            setNoteEditor(null);
          }}
          onClose={() => setNoteEditor(null)}
        />
      )}
    </>
  );
}

const CALLOUT_META = {
  note: {
    icon: Info,
    label: 'Note',
    classes: 'border-primary/40 bg-primary/5 text-text-primary',
    iconClasses: 'text-primary',
  },
  important: {
    icon: AlertTriangle,
    label: 'Important',
    classes: 'border-accent/40 bg-accent/5 text-text-primary',
    iconClasses: 'text-accent',
  },
  warning: {
    icon: AlertCircle,
    label: 'Warning',
    classes: 'border-red-500/40 bg-red-500/5 text-text-primary',
    iconClasses: 'text-red-500',
  },
} as const;

const HEADING_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: 'text-2xl font-bold text-text-primary mt-8 mb-4',
  2: 'text-xl font-semibold text-text-primary mt-8 mb-3',
  3: 'text-lg font-semibold text-text-primary mt-6 mb-2',
  4: 'text-base font-semibold text-text-primary mt-4 mb-2',
};

function Heading({
  level,
  id,
  text,
  folder,
}: {
  level: 1 | 2 | 3 | 4;
  id: string | null;
  text: BodyProseRun[];
  folder: string;
}) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  const heading = (
    <Tag id={id ?? undefined} className={HEADING_CLASSES[level]}>
      <Runs runs={text} />
    </Tag>
  );

  // Only headings with a real id are addressable sections -- nothing
  // for a star to attach to (and nowhere for BookmarksPanel to scroll
  // to) when generate_notes.py didn't emit one.
  if (!id) return heading;

  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">{heading}</div>
      <BookmarkStar pageId={folder} sectionId={id} label={runsToText(text)} />
    </div>
  );
}

interface BlockProps {
  block: BodyProseBlock;
  folder: string;
}

function Block({ block, folder }: BlockProps) {
  switch (block.type) {
    case 'heading':
      return <Heading level={block.level} id={block.id} text={block.text} folder={folder} />;

    case 'paragraph':
      return (
        <p data-block-id={block.blockId} className="mb-4 leading-relaxed text-text-secondary">
          <HighlightedRuns runs={block.runs} blockId={block.blockId} />
        </p>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          data-block-id={block.blockId}
          className={`mb-4 space-y-1 pl-6 text-text-secondary ${block.ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {block.items.map((runs, i) => (
            <li key={i}>
              <Runs runs={runs} />
            </li>
          ))}
        </ListTag>
      );
    }

    case 'table':
      return (
        <div data-block-id={block.blockId} className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-color">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-text-primary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border-color/50">
                  {row.map((cellRuns, ci) => (
                    <td key={ci} className="px-3 py-2 text-text-secondary">
                      <Runs runs={cellRuns} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'code':
      return (
        <pre data-block-id={block.blockId} className="mb-4 overflow-x-auto rounded-lg bg-bg-secondary p-3 text-sm">
          <code>{block.code}</code>
        </pre>
      );

    case 'callout': {
      const meta = CALLOUT_META[block.kind];
      const Icon = meta.icon;
      return (
        <div
          data-block-id={block.blockId}
          className={`mb-4 flex gap-2 rounded-lg border px-4 py-3 text-sm ${meta.classes}`}
        >
          <Icon size={18} className={`mt-0.5 shrink-0 ${meta.iconClasses}`} aria-hidden="true" />
          <p>
            <span className="sr-only">{meta.label}: </span>
            <HighlightedRuns runs={block.runs} blockId={block.blockId} />
          </p>
        </div>
      );
    }

    case 'youtube':
      return (
        <a
          data-block-id={block.blockId}
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-start gap-3 rounded-lg border border-border-color px-4 py-3 hover:border-accent"
        >
          <PlayCircle size={20} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
          <div>
            <div className="font-medium text-text-primary">{block.title}</div>
            {block.channel && <div className="text-sm text-text-muted">{block.channel}</div>}
            {block.why && <div className="mt-1 text-sm text-text-secondary">{block.why}</div>}
          </div>
        </a>
      );

    case 'references':
      return (
        <div data-block-id={block.blockId} className="mb-4">
          <ul className="space-y-1">
            {block.items.map((ref, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <Link2 size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline hover:text-accent"
                >
                  {ref.text}
                  <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'takeaways':
      return (
        <div data-block-id={block.blockId} className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Key Takeaways</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {block.items.map((runs, i) => (
              <li key={i}>
                <Runs runs={runs} />
              </li>
            ))}
          </ul>
        </div>
      );

    case 'image':
      return (
        <figure data-block-id={block.blockId} className="mb-4">
          <img
            src={dataPath('notes', folder, 'images', block.filename)}
            alt={block.caption}
            className="rounded-lg border border-border-color"
          />
          {block.caption && (
            <figcaption className="mt-1 text-center text-sm text-text-muted">{block.caption}</figcaption>
          )}
        </figure>
      );

    case 'collapsible':
      return (
        <details data-block-id={block.blockId} open={block.open} className="mb-4 rounded-lg border border-border-color">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 font-semibold text-text-primary">
            {block.level === 2 ? (
              <span id={block.id} className="text-lg">
                {block.heading}
              </span>
            ) : (
              <span id={block.id} className="text-base">
                {block.heading}
              </span>
            )}
            <BookmarkStar pageId={folder} sectionId={block.id} label={block.heading} />
          </summary>
          <div className="border-t border-border-color px-4 py-3">
            <BodyProseBlocks blocks={block.children} folder={folder} />
          </div>
        </details>
      );

    // T5-3b's territory (DSA <code-tabs>) and opaque raw/injected HTML —
    // deliberately not expanded here, see the block-type comment in
    // types.ts. No-op rather than a visible "unsupported" notice, since
    // neither is missing content from this ticket's own scope.
    case 'code_tabs_raw':
    case 'raw_html':
      return null;

    default:
      return null;
  }
}

export function BodyProseBlocks({ blocks, folder }: { blocks: BodyProseBlock[]; folder: string }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} folder={folder} />
      ))}
    </>
  );
}
