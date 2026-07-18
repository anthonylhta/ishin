export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import PageShell, { SectionHeading, Body, Strong } from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Changelog — Ishin',
  description: "What's shipped, and how the translations keep getting better.",
};

export default function ChangelogPage() {
  return (
    <PageShell title="Changelog" subtitle="What's shipped, and how the translations keep getting better.">
      <SectionHeading>July 2026</SectionHeading>
      <Body>
        <Strong>A proper mark.</Strong> Ishin now carries its seal — 以心 carved hanko-style —
        across the site, the app icons, and the favicon.
      </Body>
      <Body>
        <Strong>Tone Translator is now Ishin.</Strong> A new home at ishin.io: the translator lives
        at /personal, Ishin for Business opened its waitlist, and tones focused down to the two that
        matter — casual and polite.
      </Body>
      <Body>
        <Strong>Japanese names, English order.</Strong> 田中碧 now comes back &quot;Ao Tanaka&quot;,
        not &quot;Tanaka Ao&quot;.
      </Body>
      <Body>
        <Strong>Translation quality — July batch.</Strong> &quot;Before tax&quot; income is now
        税引き前, never 税抜き (that&apos;s sales tax) · brand slang keeps its Japanese nickname
        (maccas → マック, never マックス) · no more invented hearsay — らしい isn&apos;t added to
        things you stated as fact · お金かけない reads &quot;not for money&quot;, not
        &quot;low-stakes&quot; · leaving a job gets everyday phrasing, not the literary 去る.
      </Body>
      <Body>
        <Strong>IME Enter fixed.</Strong> Choosing a kanji candidate no longer sends your half-typed
        message.
      </Body>

      <SectionHeading>June 2026</SectionHeading>
      <Body>
        <Strong>The translation feed.</Strong> A full redesign: an open reading surface instead of
        chat bubbles — serif Japanese, quiet explanations, one composer.
      </Body>
      <Body>
        <Strong>Each direction, its best model.</Strong> EN→JP and JP→EN now run on different
        models, each chosen by blind evaluation against a golden set of hard cases.
      </Body>
      <Body>
        <Strong>Keigo stays keigo.</Strong> Formal Japanese now arrives as deferential English
        instead of being flattened to casual.
      </Body>
      <Body>
        <Strong>Install it.</Strong> Ishin is now a PWA — add it to your home screen; a graceful
        offline page instead of a browser error.
      </Body>
      <Body>
        <Strong>Reliability pass.</Strong> Failed saves now tell you instead of pretending; deleting
        a translation can never touch a different one; a dozen quieter edge cases fixed.
      </Body>

      <SectionHeading>May 2026</SectionHeading>
      <Body>
        <Strong>The naturalness check.</Strong> Paste your Japanese (or English) and get a ✓ or ⚠
        with the why — register-aware, not textbook-bound.
      </Body>
      <Body>
        <Strong>First release.</Strong> A JP⇄EN translator built for how people actually text —
        casual first, streaming, no account needed as a guest, history that follows you if you sign
        in.
      </Body>
    </PageShell>
  );
}
