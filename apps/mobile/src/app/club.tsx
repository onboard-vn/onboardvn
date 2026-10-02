import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getClub, listMeetups, type MockMeetup } from '../mock/club';
import { formatDate } from '../ui/format';
import { Badge, Card, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';

function MeetupCard({ meetup }: { meetup: MockMeetup }) {
  return (
    <Link href={{ pathname: '/meetup/[id]', params: { id: meetup.id } }} asChild>
      <Pressable accessibilityRole="button">
        <Card>
          <Heading>{meetup.title}</Heading>
          <Text style={styles.meta}>{formatDate(meetup.date)}</Text>
          <Text style={styles.meta}>{meetup.venue}</Text>
          <Hint>{meetup.tables.length} bàn</Hint>
          {meetup.status === 'upcoming' ? <Badge label="Sắp diễn ra" /> : null}
        </Card>
      </Pressable>
    </Link>
  );
}

export default function ClubScreen() {
  const club = getClub();
  const meetups = listMeetups();
  const upcoming = meetups.filter((m) => m.status === 'upcoming');
  const recent = meetups.filter((m) => m.status === 'done');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <Heading>{club.name}</Heading>
        <Hint>{club.members.length} thành viên</Hint>
        <Text style={styles.section}>Sắp diễn ra</Text>
        {upcoming.map((m) => (
          <MeetupCard key={m.id} meetup={m} />
        ))}
        <Text style={styles.section}>Gần đây</Text>
        {recent.map((m) => (
          <MeetupCard key={m.id} meetup={m} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  meta: { color: colors.text },
});
