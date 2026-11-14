/**
 * ContestModule — a DSA note's Contest Problems and YouTube
 * Recommendations sections, both rendered via the shared `List`
 * component (T5-3b's), per that component's own header: `dsa-contest.js`
 * confirmed to render `<div class="interview-question">` cards (NOT a
 * `<table>`, despite dead `#contestContainer table` CSS), and
 * `dsa-page.js`'s `youtube-recommendations` section confirmed the same
 * card-list shape — one component, two sections in this one file, not
 * two independently-built list renderers.
 *
 * Two independent JSON files/fetches (contest.json, youtube.json) since
 * they're two genuinely different real-world lists that just happen to
 * render the same way, same "same shape, different data" reasoning
 * `LeetCodeProblem`/`ContestProblem` already apply in types.ts. Either
 * section renders (or doesn't) independently of the other.
 * DSA-only — Note.tsx only renders this for `note.subject === 'dsa'`.
 */

import { useEffect, useState } from 'react';
import { List } from '../../components/List';
import { dataPath } from '../../lib/siteConfig';
import type { ContestData, YoutubeData } from './types';

interface ContestModuleProps {
  folder: string;
}

export function ContestModule({ folder }: ContestModuleProps) {
  const [contest, setContest] = useState<ContestData | null | 'missing'>(null);
  const [youtube, setYoutube] = useState<YoutubeData | null | 'missing'>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'contest.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: ContestData) => {
        if (!cancelled) setContest(json);
      })
      .catch(() => {
        if (!cancelled) setContest('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'youtube.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: YoutubeData) => {
        if (!cancelled) setYoutube(json);
      })
      .catch(() => {
        if (!cancelled) setYoutube('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  const hasContest = contest !== null && contest !== 'missing' && contest.problems.length > 0;
  const hasYoutube = youtube !== null && youtube !== 'missing' && youtube.videos.length > 0;

  if (!hasContest && !hasYoutube) return null;

  const contestData = hasContest ? (contest as ContestData) : null;
  const youtubeData = hasYoutube ? (youtube as YoutubeData) : null;

  return (
    <>
      {contestData && (
        <section aria-labelledby="notes-contest-heading" className="mt-8">
          <h2 id="notes-contest-heading" className="text-lg font-semibold text-text-primary mb-3">
            {contestData.title || 'Contest Problems'}
          </h2>
          <List
            ariaLabel={contestData.title || 'Contest problems'}
            items={contestData.problems}
            itemKey={(p) => p.id}
            renderItem={(p) => (
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-primary font-medium">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent underline">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </span>
                <span className="text-sm text-text-muted">{p.difficulty}</span>
              </div>
            )}
          />
        </section>
      )}

      {youtubeData && (
        <section aria-labelledby="notes-youtube-heading" className="mt-8">
          <h2 id="notes-youtube-heading" className="text-lg font-semibold text-text-primary mb-3">
            {youtubeData.title || 'YouTube Recommendations'}
          </h2>
          <List
            ariaLabel={youtubeData.title || 'YouTube recommendations'}
            items={youtubeData.videos}
            itemKey={(v) => v.id}
            renderItem={(v) => (
              <div>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-accent underline font-medium"
                >
                  {v.title}
                </a>
                <div className="mt-1 text-sm text-text-muted">
                  {v.channel}
                  {v.channel && v.duration && ' · '}
                  {v.duration}
                </div>
              </div>
            )}
          />
        </section>
      )}
    </>
  );
}
