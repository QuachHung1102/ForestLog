import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';
import { BottomNavigation, type BottomTab, TopAppBar } from '../ui';

export function SettingsScreen({
  generatedReportCount,
  onBack,
  onTabSelect,
}: {
  generatedReportCount: number;
  onBack: () => void;
  onTabSelect: (tab: BottomTab) => void;
}) {
  const [cameraAllowed, setCameraAllowed] = useState<boolean>();
  const [locationAllowed, setLocationAllowed] = useState<boolean>();

  const refreshPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const [camera, fineLocation, coarseLocation] = await Promise.all([
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA),
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ),
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ),
    ]);
    setCameraAllowed(camera);
    setLocationAllowed(fineLocation || coarseLocation);
  }, []);

  useEffect(() => {
    refreshPermissions();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPermissions();
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  const permissionLabel = (allowed?: boolean) =>
    allowed === undefined
      ? 'Đang kiểm tra'
      : allowed
      ? 'Đã cho phép'
      : 'Chưa cho phép';

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android' || cameraAllowed) return;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      await Linking.openSettings();
    }
    await refreshPermissions();
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android' || locationAllowed) return;
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    const allowed =
      results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED ||
      results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
    if (!allowed) await Linking.openSettings();
    await refreshPermissions();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.screen}>
        <TopAppBar onBack={onBack} title="Cài đặt" />
        <View style={styles.readiness}>
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="verified-user"
            size={19}
          />
          <Text style={styles.readinessText}>
            Dữ liệu offline sẵn sàng trên thiết bị
          </Text>
        </View>

        <SettingsSection title="Quyền truy cập">
          <SettingsRow
            icon="camera-alt"
            label="Camera"
            onPress={requestCameraPermission}
            value={permissionLabel(cameraAllowed)}
          />
          <SettingsRow
            icon="location-on"
            label="Vị trí"
            last
            onPress={requestLocationPermission}
            value={permissionLabel(locationAllowed)}
          />
        </SettingsSection>

        <SettingsSection title="Dữ liệu & lưu trữ">
          <SettingsRow
            icon="storage"
            label="Dung lượng"
            value="Bộ nhớ ứng dụng"
          />
          <SettingsRow icon="image" label="Ảnh gốc" value="Giữ trên thiết bị" />
          <SettingsRow
            icon="picture-as-pdf"
            label="Báo cáo PDF"
            last
            value={`${generatedReportCount} tệp trong phiên`}
          />
        </SettingsSection>

        <SettingsSection title="Tùy chọn báo cáo">
          <SettingsRow
            icon="collections"
            label="Ảnh trong PDF"
            value="Bao gồm tất cả"
          />
          <SettingsRow
            icon="text-snippet"
            label="Tên tệp"
            last
            value="Theo ngày & khu vực"
          />
        </SettingsSection>

        <SettingsSection title="Ứng dụng">
          <SettingsRow icon="smartphone" label="Giao diện" value="Sáng" />
          <SettingsRow
            icon="text-fields"
            label="Cỡ chữ"
            value="Theo thiết bị"
          />
          <SettingsRow
            icon="info-outline"
            label="Phiên bản"
            last
            value="0.1.0 MVP"
          />
        </SettingsSection>

        <Pressable
          accessibilityRole="button"
          onPress={() => Linking.openSettings()}
          style={({ pressed }) => [
            styles.systemSettings,
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            accessibilityElementsHidden
            color={colors.primary}
            name="open-in-new"
            size={20}
          />
          <Text style={styles.systemSettingsText}>Mở cài đặt thiết bị</Text>
        </Pressable>
      </ScrollView>
      <BottomNavigation compactOnly active="settings" onSelect={onTabSelect} />
    </View>
  );
}

function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  last = false,
  onPress,
  value,
}: {
  icon: MaterialIconsIconName;
  label: string;
  last?: boolean;
  onPress?: () => void;
  value: string;
}) {
  const content = (
    <>
      <MaterialIcons
        accessibilityElementsHidden
        color={colors.primary}
        name={icon}
        size={19}
      />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {onPress ? (
        <MaterialIcons
          accessibilityElementsHidden
          color={colors.primary}
          name="chevron-right"
          size={20}
        />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityHint="Mở yêu cầu cấp quyền hệ thống"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        last && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.row, last && styles.lastRow]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
    paddingTop: 0,
    backgroundColor: colors.background,
  },
  readiness: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.successSurface,
  },
  readinessText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  section: { gap: 9 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  group: {
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  rowValue: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  systemSettings: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  systemSettingsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  pressed: { opacity: 0.7 },
});
