import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DraftPhoto } from '../../domain';
import { colors } from '../theme';
import { TopAppBar } from '../ui';

export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: DraftPhoto[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<DraftPhoto>>(null);
  const { width } = useWindowDimensions();
  const viewerWidth = width - 40;
  const pageStyle = useMemo(
    () => [styles.page, { width: viewerWidth }],
    [viewerWidth],
  );

  const showPhoto = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(photos.length - 1, nextIndex));
    setIndex(safeIndex);
    listRef.current?.scrollToIndex({ animated: true, index: safeIndex });
  };

  useEffect(() => {
    if (initialIndex === undefined) return;
    setIndex(initialIndex);
    requestAnimationFrame(() =>
      listRef.current?.scrollToIndex({ animated: false, index: initialIndex }),
    );
  }, [initialIndex]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      visible={initialIndex !== undefined}
    >
      <SafeAreaView
        edges={['top', 'right', 'bottom', 'left']}
        style={styles.viewer}
      >
        <TopAppBar onBack={onClose} title="Ảnh hiện trường" />
        <View style={styles.metaRow}>
          <Text style={styles.counter}>
            Ảnh {index + 1} / {photos.length}
          </Text>
          <View style={styles.localBadge}>
            <MaterialIcons
              accessibilityElementsHidden
              color={colors.primary}
              name="storage"
              size={16}
            />
            <Text style={styles.localText}>ĐÃ LƯU CỤC BỘ</Text>
          </View>
        </View>
        <FlatList
          data={photos}
          getItemLayout={(_, photoIndex) => ({
            index: photoIndex,
            length: viewerWidth,
            offset: viewerWidth * photoIndex,
          })}
          horizontal
          keyExtractor={item => item.id}
          onMomentumScrollEnd={event =>
            setIndex(
              Math.round(event.nativeEvent.contentOffset.x / viewerWidth),
            )
          }
          pagingEnabled
          ref={listRef}
          renderItem={({ item, index: photoIndex }) => (
            <Image
              accessibilityLabel={`Ảnh hiện trường ${photoIndex + 1}`}
              resizeMode="cover"
              source={{ uri: item.localUri }}
              style={pageStyle}
            />
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.fullPhoto}
        />
        <ScrollView
          contentContainerStyle={styles.thumbnails}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {photos.map((item, photoIndex) => (
            <Pressable
              accessibilityLabel={`Xem ảnh ${photoIndex + 1}`}
              accessibilityRole="button"
              accessibilityState={{ selected: photoIndex === index }}
              key={item.id}
              onPress={() => showPhoto(photoIndex)}
              style={[
                styles.thumbnailButton,
                photoIndex === index && styles.thumbnailSelected,
              ]}
            >
              <Image source={{ uri: item.localUri }} style={styles.thumbnail} />
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.swipeHint}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.textOnDarkMuted}
            name="swipe"
            size={18}
          />
          <Text style={styles.swipeText}>Vuốt để xem ảnh trước hoặc sau</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: {
    flex: 1,
    gap: 12,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.primaryDark,
  },
  metaRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counter: { fontSize: 17, fontWeight: '800', color: colors.surface },
  localBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: colors.successSurface,
  },
  localText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  fullPhoto: { width: '100%', height: 440, borderRadius: 8 },
  page: { height: 440, borderRadius: 8 },
  thumbnails: { gap: 8, paddingVertical: 4 },
  thumbnailButton: {
    width: 104,
    height: 72,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    borderRadius: 8,
  },
  thumbnailSelected: { borderWidth: 3, borderColor: colors.surface },
  thumbnail: { width: '100%', height: '100%', borderRadius: 4 },
  swipeHint: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  swipeText: { fontSize: 13, fontWeight: '600', color: colors.textOnDarkMuted },
});
