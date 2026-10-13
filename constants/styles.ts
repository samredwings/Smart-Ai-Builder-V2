import { StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Typography } from './theme';

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  cardElevated: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.weightSemibold,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.weightSemibold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.base,
  },
  emptyText: {
    fontSize: Typography.fontSizeBase,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.lineHeightRelaxed,
  },
});
