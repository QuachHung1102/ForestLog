import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PrimaryButton } from '../ui';

const benefits: Array<{ icon: MaterialIconsIconName; label: string }> = [
  { icon: 'map', label: 'Tải bản đồ theo khu vực để dùng ngoại tuyến' },
  { icon: 'location-on', label: 'Ghi tọa độ, đo đạc và ảnh hiện trường' },
  { icon: 'description', label: 'Lưu dữ liệu cục bộ và xuất báo cáo PDF' },
];

export function WalkthroughScreen({
  error,
  onComplete,
}: {
  error: boolean;
  onComplete: () => Promise<void>;
}) {
  return (
    <View style={styles.root}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introduction}>
          <Image
            accessibilityLabel="Logo ForestLog"
            source={require('../../../assets/branding/forestlog-icon-master.png')}
            style={styles.logo}
          />
          <Text style={styles.eyebrow}>SỔ TAY HIỆN TRƯỜNG</Text>
          <Text style={styles.title}>Làm việc trong rừng,{`\n`}kể cả khi mất sóng</Text>
          <Text style={styles.description}>
            Bản đồ, GPS và dữ liệu ghi nhận được giữ an toàn trên thiết bị.
          </Text>
          <View style={styles.benefits}>
            {benefits.map(benefit => (
              <View key={benefit.label} style={styles.benefit}>
                <MaterialIcons
                  accessibilityElementsHidden
                  color={colors.primary}
                  name={benefit.icon}
                  size={24}
                />
                <Text style={styles.benefitText}>{benefit.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.action}>
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              Chưa thể lưu thiết lập. Vui lòng thử lại.
            </Text>
          ) : null}
          <PrimaryButton
            icon="arrow-forward"
            label="Bắt đầu sử dụng"
            onPress={onComplete}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  introduction: { alignItems: 'center', gap: 16 },
  logo: { width: 112, height: 112, borderRadius: 26 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  benefits: { alignSelf: 'stretch', gap: 10 },
  benefit: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.text,
  },
  action: { gap: 8 },
  error: { textAlign: 'center', fontSize: 13, color: colors.danger },
});
