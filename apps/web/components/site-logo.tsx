import Image from 'next/image';
import { SITE_NAME } from '@/lib/site';

const WIDTH = 600;
const HEIGHT = 198;

export function SiteLogo() {
  return (
    <>
      <Image
        src="/brand/logo-horizontal.png"
        alt={SITE_NAME}
        width={WIDTH}
        height={HEIGHT}
        priority
        className="h-9 w-auto dark:hidden"
      />
      <Image
        src="/brand/logo-horizontal-dark.png"
        alt={SITE_NAME}
        width={WIDTH}
        height={HEIGHT}
        priority
        className="hidden h-9 w-auto dark:block"
      />
    </>
  );
}
