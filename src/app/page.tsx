import { SiteFooter } from '@/components/SiteFooter';
import { Tiggl } from '@/components/Tiggl';

const Home = () => (
  <>
    <div className="tiggl-backdrop" aria-hidden>
      <div className="tiggl-backdrop-grid" />
    </div>
    <main
      className="relative z-10 flex w-full min-w-0 items-center justify-center overflow-x-auto p-4 sm:p-6"
      style={{ minHeight: '100dvh' }}
    >
      <div className="flex w-full min-w-0 flex-col gap-5 [@media(hover:hover)_and_(pointer:fine)]:w-max">
        <Tiggl />
        <SiteFooter />
      </div>
    </main>
  </>
);

export default Home;
