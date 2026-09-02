import { Wordmark } from '@/components/Wordmark';
import { version } from '@/lib/version';

const year = new Date().getFullYear();

const footerLink =
  'text-zinc-400 underline decoration-zinc-500 underline-offset-4 transition-colors hover:text-zinc-100 hover:no-underline focus-visible:text-white focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#030304] motion-reduce:transition-none';

export const SiteFooter = () => (
  <footer className="max-w-full pl-4 text-[11px] leading-relaxed text-zinc-400">
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Wordmark className="mr-0 text-sm font-semibold" />
      <span>
        is an original game by{' '}
        <a
          href="https://taydigital.co.uk"
          className={footerLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Tay Digital
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span aria-hidden className="px-2.5 text-zinc-600">
          ·
        </span>
        © {year} All rights reserved
        <span aria-hidden className="px-2.5 text-zinc-600">
          ·
        </span>
        v{version}
      </span>
    </p>
  </footer>
);
