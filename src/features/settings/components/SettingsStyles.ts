import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 48,
    marginTop: 32,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  downloadButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 4,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionContent: {
    borderRadius: 12,
    gap: 2,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
});
