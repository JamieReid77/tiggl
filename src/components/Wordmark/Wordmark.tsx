import { cn } from '@/lib/utils';

type WordmarkProps = {
  as?: 'h1' | 'p' | 'span';
  className?: string;
  boxed?: boolean;
};

export const Wordmark = ({
  as: Comp = 'span',
  className,
  boxed = false,
}: WordmarkProps) => (
  <Comp
    aria-label="Tiggl."
    className={cn(
      'font-display font-bold tracking-tight',
      boxed
        ? 'inline-flex items-end bg-white px-2 py-1 text-sm font-semibold text-zinc-950 [text-shadow:none]'
        : 'relative inline-block mr-[0.24em] text-white',
      className,
      'leading-none',
    )}
  >
    Tiggl
    <span
      className={
        boxed
          ? 'mb-[0.14em] ml-[0.06em] size-[0.2em] shrink-0 rounded-full bg-brand'
          : 'absolute bottom-[0.16em] left-full ml-[0.04em] size-[0.2em] rounded-full bg-brand'
      }
      aria-hidden
    />
  </Comp>
);
