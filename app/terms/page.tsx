export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell, { SectionHeading, Body, BodyLink } from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Terms of use — Ishin',
  description: 'The terms for using Ishin: free, provided as-is, fair use, and your content stays yours.',
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of use" subtitle="Last updated 19 July 2026">
      <SectionHeading>The service</SectionHeading>
      <Body>
        Ishin&apos;s personal translator is free, provided as-is, and may change or pause at any
        time. Translations and checks are AI-generated: they are usually good and occasionally
        wrong. For messages where the stakes are real, use your own judgement — that&apos;s rather
        the point.
      </Body>

      <SectionHeading>Fair use</SectionHeading>
      <Body>
        Don&apos;t abuse the service: no unlawful content, no attempts to disrupt or overload it,
        no scraping the API. Rate limits exist and accounts that hammer them may be suspended.
      </Body>

      <SectionHeading>Your content</SectionHeading>
      <Body>
        Your messages are yours. You give us permission to process them for the sole purpose of
        producing your translation or check — see the{' '}
        <Link href="/privacy" style={{ color: 'var(--text-primary)' }}>
          privacy policy
        </Link>{' '}
        for exactly what is stored.
      </Body>

      <SectionHeading>Liability</SectionHeading>
      <Body>
        To the maximum extent permitted by law, Ishin is not liable for losses arising from use of
        the service, including decisions made on the basis of a translation. Nothing in these terms
        excludes rights or guarantees under the Australian Consumer Law that cannot lawfully be
        excluded. This service is operated from Australia and these terms are governed by Australian
        law.
      </Body>

      <SectionHeading>Changes</SectionHeading>
      <Body>
        If these terms change, the date above changes with them. Questions:{' '}
        <BodyLink href="mailto:hello@ishin.io" />.
      </Body>
    </PageShell>
  );
}
