import { View } from 'react-native';
import { space } from '../../ui/theme';
import { formatVnDateTime } from './time';
import { Body, CardLink, Muted } from './ui';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';


export interface EventListItem {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  locationLabel: string;
  goingCount: number;
  capacity: number | null;
}

export function EventList({ items }: { items: EventListItem[] }) {
  useAppPreferences();
  return (
    <View style={{ gap: space.md }}>
      {items.map((meetup) => (
        <CardLink key={meetup.id} to={`/events/${meetup.slug}`}>
          <Body bold>{meetup.title}</Body>
          <Muted>{formatVnDateTime(meetup.startsAt)}</Muted>
          <Muted>{meetup.locationLabel}</Muted>
          <Body>
            {meetup.goingCount}
            {meetup.capacity ? `/${meetup.capacity}` : ''} {' '}{t("người đi")}</Body>
        </CardLink>
      ))}
    </View>
  );
}
