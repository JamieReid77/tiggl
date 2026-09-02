import { SiteFooter } from '@/components/SiteFooter';
import { Tiggl } from '@/components/Tiggl';

const Home = () => (
  <>
    <div className="tiggl-backdrop" aria-hidden>
      <div className="tiggl-backdrop-grid" />
    </div>
    <main
      className="relative z-10 flex w-full items-center justify-center overflow-x-auto p-6"
      style={{ minHeight: '100dvh' }}
    >
      <div className="flex flex-col gap-5">
        <Tiggl />
        <SiteFooter />
      </div>
    </main>
  </>
);

export default Home;
