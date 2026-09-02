import { Wordmark } from '@/components/Wordmark';
import { version } from '@/lib/version';

const year = new Date().getFullYear();

const footerLink =
  'text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#030304] motion-reduce:transition-none';

export const SiteFooter = () => (
  <footer className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 pl-4 text-[11px] leading-relaxed text-zinc-500">
    <Wordmark className="mr-0 text-sm font-semibold" />
    <p>
      is an original game by{' '}
      <a href="https://taydigital.co.uk" className={footerLink}>
        Tay Digital
      </a>
      <span aria-hidden className="px-2.5 text-zinc-700">
        ·
      </span>
      © {year} All rights reserved
      <span aria-hidden className="px-2.5 text-zinc-700">
        ·
      </span>
      v{version}
    </p>
  </footer>
);
