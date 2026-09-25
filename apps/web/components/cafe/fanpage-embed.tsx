'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { facebookPagePluginUrl } from '@/lib/cafe-fanpage';

/** Click-to-load Facebook Page Plugin: the iframe (and its cookies) never load until the visitor
 * explicitly opts in, after seeing a short notice. */
export function FanpageEmbed({ fanpageUrl }: { fanpageUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          Nhấn để xem fanpage. Facebook có thể đặt cookie khi nội dung được tải.
        </p>
        <Button type="button" variant="outline" onClick={() => setLoaded(true)}>
          Xem fanpage
        </Button>
      </div>
    );
  }

  return (
    <iframe
      title="Fanpage Facebook"
      src={facebookPagePluginUrl(fanpageUrl)}
      width="500"
      height="600"
      className="max-w-full rounded-lg border"
      style={{ border: 'none', overflow: 'hidden' }}
      loading="lazy"
      allow="encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
