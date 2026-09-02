import { version } from '@/lib/version';

const year = new Date().getFullYear();

const footerLink =
  'text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-[#030304] motion-reduce:transition-none';

export const SiteFooter = () => (
  <footer className="max-w-full text-[11px] leading-relaxed text-zinc-500">
    <p>
      Tiggl is an original game by{' '}
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
