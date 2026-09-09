import { Pressable, ScrollView, View } from 'react-native';

import type { Tag } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

import { MATERIAL_FILTERS, type MaterialFilterCode } from '../types';

export function MaterialFilters({
  activeTypes,
  onToggleType,
  tags,
  activeTagIds,
  onToggleTag,
  onDeleteTag,
}: {
  activeTypes: readonly MaterialFilterCode[];
  onToggleType: (code: MaterialFilterCode) => void;
  tags: readonly Tag[];
  activeTagIds: readonly number[];
  onToggleTag: (tagId: number) => void;
  /** Если передан — тег удаляется долгим нажатием */
  onDeleteTag?: (tag: Tag) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {MATERIAL_FILTERS.map((filter) => (
          <FilterChip
            key={filter.code}
            label={filter.label}
            active={activeTypes.includes(filter.code)}
            onPress={() => onToggleType(filter.code)}
          />
        ))}
      </View>

      {tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {tags.map((tag) => (
              <FilterChip
                key={tag.id}
                label={tag.name}
                active={activeTagIds.includes(tag.id)}
                onPress={() => onToggleTag(tag.id)}
                onLongPress={onDeleteTag ? () => onDeleteTag(tag) : undefined}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      {tags.length > 0 && onDeleteTag ? (
        <Text variant="caption" tone="muted">
          Удерживайте тег, чтобы удалить его из базы.
        </Text>
      ) : null}
    </View>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
  onLongPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? theme.colors.accent : theme.colors.surface,
        borderColor: active ? theme.colors.accent : theme.colors.border,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 40,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Text variant="label" tone={active ? 'inverse' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}
