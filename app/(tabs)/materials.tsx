import { useMemo } from 'react';
import { View } from 'react-native';

import { listMaterials } from '@/db/repositories/materials.repo';
import { useDatabase } from '@/db/useDatabase';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, EmptyState, Screen, Text } from '@/ui';

export default function MaterialsScreen() {
  const db = useDatabase();
  const theme = useTheme();
  const materials = useMemo(() => listMaterials(db), [db]);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.lg }}>
        <Card>
          <Text variant="subtitle">В базе материалов: {materials.length}</Text>
          <Text tone="muted">Импорт файлов, превью и теги появятся на этапе Э3.</Text>
        </Card>
        <EmptyState title="База материалов появится на этапе Э3" />
      </View>
    </Screen>
  );
}
