import { View } from 'react-native';
import { space } from '../../ui/theme';
import { formatVnDateTime } from './time';
import { Body, CardLink, Muted } from './ui';

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
  return (
    <View style={{ gap: space.md }}>
      {items.map((meetup) => (
        <CardLink key={meetup.id} to={`/events/${meetup.slug}`}>
          <Body bold>{meetup.title}</Body>
          <Muted>{formatVnDateTime(meetup.startsAt)}</Muted>
          <Muted>{meetup.locationLabel}</Muted>
          <Body>
            {meetup.goingCount}
            {meetup.capacity ? `/${meetup.capacity}` : ''} người đi
          </Body>
        </CardLink>
      ))}
    </View>
  );
}
