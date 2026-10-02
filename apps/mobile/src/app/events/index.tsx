import type {
  MeetupCalendarDay,
  MeetupListResponse,
  ProvinceDto,
  ProvinceListResponse,
  WardListResponse,
} from '@onboard/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { api } from '../../api/client';
import { EventFilters } from '../../features/events/event-filters';
import { EventList } from '../../features/events/event-list';
import { parseEventSearchParams, parseEventsView } from '../../features/events/filters';
import { SessionCalendar } from '../../features/events/session-calendar';
import { currentVnMonth, localDateTimeInputToIso } from '../../features/events/time';
import {
  LinkBtn,
  LoadGate,
  Muted,
  Page,
  Row,
  SectionTitle,
  Title,
  href,
} from '../../features/events/ui';
import { useFetch } from '../../features/use-fetch';
import { Segmented } from '../../ui/primitives';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function EventsPage() {
  const router = useRouter();
  const sp = useLocalSearchParams();
  const spKey = JSON.stringify(sp);
  const view = parseEventsView(sp);
  const filters = parseEventSearchParams(sp);
  const rawMonth = first(sp.month);
  const month = rawMonth && MONTH_RE.test(rawMonth) ? rawMonth : currentVnMonth();
  const rawDate = first(sp.date);
  const selectedDate = rawDate && DATE_RE.test(rawDate) ? rawDate : undefined;

  const load = useCallback(
    async (signal: AbortSignal) => {
      const provinces: ProvinceDto[] = await api<ProvinceListResponse>('/locations/provinces', {
        signal,
      }).then(
        (r) => r.items,
        () => [],
      );
      const province = filters.province
        ? provinces.find((p) => p.slug === filters.province)
        : undefined;
      const wards = province
        ? await api<WardListResponse>(`/locations/provinces/${province.code}/wards`, {
            signal,
          }).then(
            (r) => r.items,
            () => [],
          )
        : [];
      const ward = filters.ward ? wards.find((w) => w.slug === filters.ward) : undefined;

      if (view === 'calendar') {
        const days = await api<MeetupCalendarDay[]>('/events/calendar', {
          query: { month, provinceCode: province?.code },
          signal,
        }).catch(() => []);
        const dayItems = selectedDate
          ? await api<MeetupListResponse>('/events', {
              query: { date: selectedDate, pageSize: 50, provinceCode: province?.code },
              signal,
            }).then(
              (r) => r.items,
              () => [],
            )
          : [];
        return {
          provinces,
          province,
          ward,
          days,
          dayItems,
          items: [] as MeetupListResponse['items'],
        };
      }

      const cafeId = first(sp.cafeId);
      const list = await api<MeetupListResponse>('/events', {
        query: {
          provinceCode: province?.code,
          wardCode: ward?.code,
          cafeId,
          from:
            filters.from && DATE_RE.test(filters.from)
              ? localDateTimeInputToIso(`${filters.from}T00:00`)
              : undefined,
        },
        signal,
      });
      return {
        provinces,
        province,
        ward,
        days: [] as MeetupCalendarDay[],
        dayItems: [] as MeetupListResponse['items'],
        items: list.items,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spKey],
  );
  const { data, error, loading } = useFetch(load);

  const listParams = new URLSearchParams();
  if (filters.province) listParams.set('province', filters.province);
  if (filters.ward) listParams.set('phuong', filters.ward);
  const calendarParams = new URLSearchParams(listParams);
  calendarParams.set('view', 'calendar');
  calendarParams.set('month', month);

  return (
    <Page maxWidth={768}>
      <Stack.Screen options={{ title: 'Kèo' }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Kèo</Title>
        <LinkBtn label="Tạo kèo" to="/events/new" />
      </Row>
      <Segmented
        value={view}
        onChange={(v) =>
          router.push(
            href(
              v === 'calendar'
                ? `/events?${calendarParams.toString()}`
                : listParams.size
                  ? `/events?${listParams.toString()}`
                  : '/events',
            ),
          )
        }
        options={[
          { value: 'list', label: 'Danh sách' },
          { value: 'calendar', label: 'Lịch tháng' },
        ]}
      />
      <LoadGate loading={loading} error={error} hasData={!!data}>
        {data && view === 'calendar' ? (
          <>
            <SessionCalendar
              month={month}
              days={data.days}
              baseHref={`/events?view=calendar${filters.province ? `&province=${filters.province}` : ''}`}
            />
            {selectedDate ? (
              <>
                <SectionTitle>Kèo ngày {selectedDate}</SectionTitle>
                {data.dayItems.length === 0 ? (
                  <Muted>Không có Kèo nào.</Muted>
                ) : (
                  <EventList items={data.dayItems} />
                )}
              </>
            ) : null}
          </>
        ) : data ? (
          <>
            <EventFilters
              provinces={data.provinces}
              initialProvinceCode={data.province?.code}
              initialWardCode={data.ward?.code}
              initialFilters={filters}
              view={view}
            />
            {data.items.length === 0 ? (
              <Muted>Chưa có Kèo nào sắp diễn ra.</Muted>
            ) : (
              <EventList items={data.items} />
            )}
          </>
        ) : null}
      </LoadGate>
    </Page>
  );
}
