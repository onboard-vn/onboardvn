import type { Metadata } from 'next';
import Link from 'next/link';
import { EventFilters } from '@/components/events/event-filters';
import { SessionCalendar } from '@/components/session-calendar';
import { buttonVariants } from '@/components/ui/button';
import { serverApi } from '@/lib/api-server';
import { currentVnMonth, formatVnDateTime, localDateTimeInputToIso } from '@/lib/events-time';
import { parseEventSearchParams, parseEventsView } from '@/lib/events-filters';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Kèo · ${SITE_NAME}` };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function EventsPage(props: PageProps<'/events'>) {
  const sp = await props.searchParams;
  const view = parseEventsView(sp);
  const filters = parseEventSearchParams(sp);
  const cafeId = firstValue(sp.cafeId);
  const rawMonth = firstValue(sp.month);
  const month = rawMonth && MONTH_RE.test(rawMonth) ? rawMonth : currentVnMonth();

  const client = await serverApi();

  const provincesRes = await client.api.locations.provinces.$get();
  const provinces = provincesRes.ok ? (await provincesRes.json()).items : [];
  const selectedProvince = filters.province
    ? provinces.find((p) => p.slug === filters.province)
    : undefined;
  const initialWards = selectedProvince
    ? await client.api.locations.provinces[':code'].wards
        .$get({ param: { code: selectedProvince.code } })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((body) => body.items)
    : [];
  const selectedWard = filters.ward ? initialWards.find((w) => w.slug === filters.ward) : undefined;

  if (view === 'calendar') {
    const res = await client.api.events.calendar.$get({
      query: { month, ...(selectedProvince && { provinceCode: selectedProvince.code }) },
    });
    const days = res.ok ? await res.json() : [];
    const selectedDate = firstValue(sp.date);
    let dayMeetups: {
      id: string;
      slug: string;
      title: string;
      startsAt: string;
      locationLabel: string;
      goingCount: number;
      capacity: number | null;
    }[] = [];
    if (selectedDate) {
      const dayRes = await client.api.events.$get({
        query: {
          date: selectedDate,
          pageSize: '50',
          ...(selectedProvince && { provinceCode: selectedProvince.code }),
        },
      });
      dayMeetups = dayRes.ok ? (await dayRes.json()).items : [];
    }

    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <Header />
        <ViewToggle view="calendar" filters={filters} month={month} />
        <SessionCalendar
          month={month}
          days={days}
          baseHref={`/events?view=calendar${filters.province ? `&province=${filters.province}` : ''}`}
        />
        {selectedDate ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Kèo ngày {selectedDate}</h2>
            {dayMeetups.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có Kèo nào.</p>
            ) : (
              <EventList items={dayMeetups} />
            )}
          </section>
        ) : null}
      </main>
    );
  }

  const listRes = await client.api.events.$get({
    query: {
      ...(filters.province && selectedProvince && { provinceCode: selectedProvince.code }),
      ...(filters.ward && selectedWard && { wardCode: selectedWard.code }),
      ...(cafeId && { cafeId }),
      ...(filters.from && { from: localDateTimeInputToIso(`${filters.from}T00:00`) }),
    },
  });
  if (!listRes.ok) throw new Error('Không tải được danh sách Kèo');
  const { items } = await listRes.json();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Header />
      <ViewToggle view="list" filters={filters} month={month} />

      <EventFilters
        provinces={provinces}
        initialProvinceCode={selectedProvince?.code}
        initialWardCode={selectedWard?.code}
        initialWards={initialWards}
        initialFilters={filters}
        view={view}
      />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có Kèo nào sắp diễn ra.</p>
      ) : (
        <EventList items={items} />
      )}
    </main>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">Kèo</h1>
      <Link href="/events/new" className={buttonVariants()}>
        Tạo kèo
      </Link>
    </div>
  );
}

function ViewToggle({
  view,
  filters,
  month,
}: {
  view: 'list' | 'calendar';
  filters: ReturnType<typeof parseEventSearchParams>;
  month: string;
}) {
  const listParams = new URLSearchParams();
  if (filters.province) listParams.set('province', filters.province);
  if (filters.ward) listParams.set('phuong', filters.ward);
  const calendarParams = new URLSearchParams(listParams);
  calendarParams.set('view', 'calendar');
  calendarParams.set('month', month);

  return (
    <div role="tablist" className="grid w-fit grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
      <Link
        href={listParams.size ? `/events?${listParams.toString()}` : '/events'}
        role="tab"
        aria-selected={view === 'list'}
        className={`rounded px-3 py-1 ${view === 'list' ? 'bg-background font-medium shadow-sm' : ''}`}
      >
        Danh sách
      </Link>
      <Link
        href={`/events?${calendarParams.toString()}`}
        role="tab"
        aria-selected={view === 'calendar'}
        className={`rounded px-3 py-1 ${view === 'calendar' ? 'bg-background font-medium shadow-sm' : ''}`}
      >
        Lịch tháng
      </Link>
    </div>
  );
}

function EventList({
  items,
}: {
  items: {
    id: string;
    slug: string;
    title: string;
    startsAt: string;
    locationLabel: string;
    goingCount: number;
    capacity: number | null;
  }[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((meetup) => (
        <li key={meetup.id}>
          <Link
            href={`/events/${meetup.slug}`}
            className="hover:border-foreground/40 block rounded-lg border p-4 transition"
          >
            <h2 className="font-medium">{meetup.title}</h2>
            <p className="text-muted-foreground text-sm">{formatVnDateTime(meetup.startsAt)}</p>
            <p className="text-muted-foreground text-sm">{meetup.locationLabel}</p>
            <p className="mt-1 text-xs">
              {meetup.goingCount}
              {meetup.capacity ? `/${meetup.capacity}` : ''} người đi
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
