import { useState } from 'react';
import { Mail, MessageSquareText, ChevronDown, ExternalLink } from 'lucide-react';
import { PageMeta } from '../../components/PageMeta';
import { Logo } from '../../components/Logo';

/**
 * Hand-drawn GitHub mark — lucide-react (this project's chosen icon
 * strategy, R4-1) dropped brand/logo glyphs (Github, Twitter, etc.) some
 * versions back, so there's no `Github` export to import here. Same
 * convention as every other hand-drawn fallback in this codebase
 * (GearIconFallback in App.tsx, ScrollTextIconFallback/AlertIconFallback
 * in Footer.tsx, BookmarkIconFallback/FlagIconFallback in Quiz/icons.tsx):
 * a plain inline SVG, sized/colored via `currentColor` so it matches
 * whatever text color it's placed next to.
 */
function GithubMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.16.69-3.83-1.34-3.83-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.52-.29-5.17-1.26-5.17-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.16a10.9 10.9 0 0 1 5.72 0c2.18-1.47 3.14-1.16 3.14-1.16.62 1.57.23 2.73.11 3.02.73.79 1.17 1.8 1.17 3.04 0 4.35-2.65 5.31-5.18 5.59.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.2.65.79.54A11.26 11.26 0 0 0 23.25 11.75C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

/**
 * Contact — B-1 (Feedback system + Contact page).
 *
 * Ticket asks for two things sharing one page: a dedicated Contact page
 * (project info / contributor info / GitHub links / FAQ) and an embedded
 * Google Form for feedback (bug reports / content corrections / topic
 * requests / general feedback). Built as one page rather than two routes
 * since the ticket describes them together and a visitor reporting a bug
 * likely wants the "who built this, how do I reach them" context right
 * next to the form.
 *
 * Contributor name, license, and contact email are pulled from the same
 * values Footer.tsx already renders (Namrata Mulwani, CC BY-NC 4.0,
 * awslecturenotes@gmail.com) rather than re-typing a second source of
 * truth for them.
 *
 * FEEDBACK_FORM_EMBED_URL is intentionally empty: this ticket can't
 * create a real, connected Google Form + Sheet from here (that's a
 * one-time manual step in Namu's own Google account). Once that form
 * exists, drop its "embed" share URL in below — the iframe renders
 * automatically and the mailto fallback disappears. Shipping a
 * placeholder/fake form ID would look done while silently not working,
 * which is worse than an honest fallback.
 */

const CONTRIBUTOR_NAME = 'Namrata Mulwani';
const CONTACT_EMAIL = 'awslecturenotes@gmail.com';
// Inferred from vite.config.ts's `base: '/ResourcesV2/'` + PageMeta's
// SITE_ORIGIN (namrata2709.github.io) — confirm this is the right repo
// name before relying on the link; update here if it isn't.
const GITHUB_REPO_URL = 'https://github.com/namrata2709/ResourcesV2';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const LICENSE_URL = 'https://creativecommons.org/licenses/by-nc/4.0/';

/** Set this to the real Google Form's "embed" URL once the form exists. */
const FEEDBACK_FORM_EMBED_URL = '';

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What is Notebook Buddy?',
    answer:
      "A learning dashboard built while studying for AWS certifications and DSA — structured notes, quizzes, and a gallery of diagrams, all generated from one content pipeline and kept in sync automatically.",
  },
  {
    question: 'Is this free to use?',
    answer:
      'Yes. Everything here is shared under Creative Commons BY-NC 4.0 — free to read, share, and adapt for educational use, with credit and a link back to the license.',
  },
  {
    question: 'I found an error in a note — how do I report it?',
    answer:
      'Use the feedback form above and pick "Content correction," or open a GitHub issue directly if you already have an account. Either way, include the note title so it is easy to find.',
  },
  {
    question: 'Can I suggest a new topic or request a note?',
    answer:
      'Yes — the feedback form has a "Topic request" option for exactly this. There is no guaranteed timeline, but every request gets read.',
  },
  {
    question: 'Can I use this material in my own course or blog?',
    answer:
      'Non-commercial use is covered by the CC BY-NC 4.0 license already — just credit the source and link to the license. For commercial use, reach out at the email below.',
  },
];

export function Contact() {
  return (
    <div className="contact-page font-poppins">
      <PageMeta
        title="Contact & Feedback"
        description="Get in touch, report a bug, request a topic, or learn more about the project behind Notebook Buddy."
        canonicalPath="/contact"
      />

      <header className="flex flex-col items-center text-center gap-3 py-10 px-4">
        <Logo variant="icon" size={56} />
        <h1 className="text-2xl font-bold text-text-primary">Contact &amp; Feedback</h1>
        <p className="subtitle text-text-muted max-w-md">
          Found a bug, spotted a mistake in a note, or want to suggest something new? This is the
          place.
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 flex flex-col gap-12">
        <FeedbackSection />
        <ProjectInfoSection />
        <ContributorSection />
        <GitHubLinksSection />
        <FaqSection />
      </main>
    </div>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-3">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      {children}
    </h2>
  );
}

function FeedbackSection() {
  return (
    <section aria-labelledby="feedback-heading">
      <SectionHeading icon={<MessageSquareText size={20} />}>
        <span id="feedback-heading">Send feedback</span>
      </SectionHeading>
      <p className="text-sm text-text-secondary mb-4">
        Bug reports, content corrections, topic requests, or general feedback — all welcome.
      </p>

      {FEEDBACK_FORM_EMBED_URL ? (
        <div className="rounded-xl border border-border-color overflow-hidden bg-bg-card">
          <iframe
            src={FEEDBACK_FORM_EMBED_URL}
            title="Feedback form"
            width="100%"
            height={640}
            className="block"
          >
            Loading feedback form…
          </iframe>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-color bg-bg-card p-6 text-center">
          <p className="text-sm text-text-secondary mb-3">
            The feedback form isn&apos;t connected yet — in the meantime, send feedback directly by
            email.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Notebook%20Buddy%20feedback`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent underline underline-offset-2"
          >
            <Mail size={16} aria-hidden="true" />
            {CONTACT_EMAIL}
          </a>
        </div>
      )}
    </section>
  );
}

function ProjectInfoSection() {
  return (
    <section aria-labelledby="project-info-heading">
      <SectionHeading icon={<Logo variant="icon" size={20} />}>
        <span id="project-info-heading">About the project</span>
      </SectionHeading>
      <p className="text-sm text-text-secondary leading-relaxed">
        Notebook Buddy is a personal learning dashboard — structured notes, spaced-repetition-style
        quizzes, and a diagram gallery for AWS certification prep and data structures &amp;
        algorithms practice. Content is generated from a single Python pipeline so notes, quizzes,
        and the search index all stay in sync.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed mt-2">
        Shared under{' '}
        <a
          href={LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-accent underline underline-offset-2"
        >
          CC BY-NC 4.0
        </a>{' '}
        — free to share and adapt for educational purposes, with credit and a link to the license.
        For commercial licensing, use the email below.
      </p>
    </section>
  );
}

function ContributorSection() {
  return (
    <section aria-labelledby="contributor-heading">
      <SectionHeading icon={<Mail size={20} />}>
        <span id="contributor-heading">Who&apos;s behind this</span>
      </SectionHeading>
      <p className="text-sm text-text-secondary leading-relaxed">
        Built and maintained by <strong className="text-text-primary">{CONTRIBUTOR_NAME}</strong>.
      </p>
      <p className="text-sm text-text-secondary mt-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-1.5 text-primary hover:text-accent underline underline-offset-2"
        >
          <Mail size={16} aria-hidden="true" />
          {CONTACT_EMAIL}
        </a>
      </p>
    </section>
  );
}

function GitHubLinksSection() {
  return (
    <section aria-labelledby="github-heading">
      <SectionHeading icon={<GithubMark size={20} />}>
        <span id="github-heading">GitHub</span>
      </SectionHeading>
      <ul className="flex flex-col gap-2 text-sm">
        <li>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:text-accent underline underline-offset-2"
          >
            <GithubMark size={16} />
            Source repository
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </li>
        <li>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:text-accent underline underline-offset-2"
          >
            <GithubMark size={16} />
            Report an issue
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="faq-heading">
      <SectionHeading icon={<MessageSquareText size={20} />}>
        <span id="faq-heading">FAQ</span>
      </SectionHeading>
      <div className="flex flex-col gap-2">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const buttonId = `faq-button-${index}`;
          return (
            <div
              key={item.question}
              className="rounded-lg border border-border-color bg-bg-card overflow-hidden"
            >
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  {item.question}
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </h3>
              {isOpen && (
                <p
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="px-4 pb-4 text-sm text-text-secondary leading-relaxed"
                >
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
