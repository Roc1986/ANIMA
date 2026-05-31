import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, GRADIENTS } from '../theme';
import { t } from '../../../../packages/shared/src/i18n';
import type { Language } from '../../../../packages/shared/src/types/user';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const subscriptionTier = 'free'; // In production: from Supabase user data

  function handleSave() {
    // TODO: Save to Supabase users table
    setIsEditing(false);
  }

  function handleExportData() {
    Alert.alert(
      'Export Data',
      'Your data will be prepared and sent to your registered email address as a JSON file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('TODO: trigger GDPR export') },
      ],
    );
  }

  function handleDeleteData() {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete your account, readings, and all personal data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => console.log('TODO: trigger GDPR deletion'),
        },
      ],
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{name ? name[0].toUpperCase() : '✦'}</Text>
            </View>
            <Text style={styles.userName}>{name || 'Your Name'}</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>
                {subscriptionTier === 'free' ? '✦ Free' : subscriptionTier === 'subscription' ? '✦ Subscriber' : '⭐ Premium'}
              </Text>
            </View>
          </View>

          {/* Profile Info */}
          <Section title={t('profile.title')}>
            <Row
              label={t('profile.name')}
              value={name}
              editable={isEditing}
              onChangeText={setName}
              placeholder="Your name"
            />
            <Row
              label={t('profile.birthDate')}
              value={birthDate}
              editable={isEditing}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
            />
            <Row
              label={t('profile.birthTime')}
              value={birthTime}
              editable={isEditing}
              onChangeText={setBirthTime}
              placeholder="HH:MM"
            />
            <Row
              label={t('profile.birthPlace')}
              value={birthPlace}
              editable={isEditing}
              onChangeText={setBirthPlace}
              placeholder="City, Country"
            />

            {isEditing && (
              <View style={styles.languageSection}>
                <Text style={styles.rowLabel}>{t('profile.language')}</Text>
                <View style={styles.languageOptions}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langButton,
                        language === lang.code && styles.langButtonActive,
                      ]}
                      onPress={() => setLanguage(lang.code)}
                    >
                      <Text>{lang.flag}</Text>
                      <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {isEditing ? (
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* Subscription */}
          <Section title={t('subscription.currentPlan')}>
            <View style={styles.subscriptionCard}>
              <Text style={styles.subscriptionTier}>
                {subscriptionTier === 'free' ? t('subscription.free') : subscriptionTier === 'subscription' ? 'Subscriber' : t('subscription.premium')}
              </Text>
              {subscriptionTier === 'free' && (
                <TouchableOpacity style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>{t('subscription.subscribe_cta')} ✦</Text>
                </TouchableOpacity>
              )}
            </View>
          </Section>

          {/* Privacy */}
          <Section title={t('privacy.title')}>
            <Text style={styles.privacyNote}>{t('privacy.encryptionNote')}</Text>
            <Text style={styles.privacyNote}>{t('privacy.gdprNote')}</Text>
            <TouchableOpacity style={styles.privacyAction} onPress={handleExportData}>
              <Text style={styles.privacyActionText}>📥 {t('privacy.exportData')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.privacyAction, styles.dangerAction]} onPress={handleDeleteData}>
              <Text style={[styles.privacyActionText, styles.dangerText]}>🗑 {t('privacy.deleteData')}</Text>
            </TouchableOpacity>
          </Section>

          {/* About */}
          <Section title="About">
            <TouchableOpacity style={styles.aboutLink}>
              <Text style={styles.aboutLinkText}>{t('privacy.policyLink')}</Text>
            </TouchableOpacity>
            <Text style={styles.version}>ANIMA v1.0.0</Text>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  editable,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}</Text>
      {editable ? (
        <TextInput
          style={rowStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
        />
      ) : (
        <Text style={rowStyles.value}>{value || <Text style={rowStyles.empty}>{placeholder}</Text>}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING['2xl'] },
  avatarSection: { alignItems: 'center', marginVertical: SPACING.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarInitial: { fontSize: 32, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.fontWeight.bold },
  userName: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.textPrimary },
  tierBadge: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tierText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.accent },
  languageSection: { marginVertical: SPACING.sm },
  languageOptions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  langButton: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  langButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.primary },
  langLabel: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.textSecondary },
  langLabelActive: { color: COLORS.textPrimary },
  rowLabel: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.accent, fontWeight: TYPOGRAPHY.fontWeight.medium, marginBottom: SPACING.xs },
  editButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  saveButton: { flex: 1, backgroundColor: COLORS.secondary, borderRadius: BORDER_RADIUS.full, padding: SPACING.sm, alignItems: 'center' },
  saveButtonText: { color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  cancelButton: { flex: 1, borderRadius: BORDER_RADIUS.full, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  cancelButtonText: { color: COLORS.textSecondary },
  editButton: { marginTop: SPACING.md, alignItems: 'center', padding: SPACING.sm },
  editButtonText: { color: COLORS.accent, fontSize: TYPOGRAPHY.fontSize.sm },
  subscriptionCard: { alignItems: 'center', padding: SPACING.md },
  subscriptionTier: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  upgradeButton: { backgroundColor: COLORS.gold, borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  upgradeButtonText: { color: '#000', fontWeight: TYPOGRAPHY.fontWeight.bold },
  privacyNote: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textMuted, marginBottom: SPACING.sm, lineHeight: TYPOGRAPHY.fontSize.sm * 1.6 },
  privacyAction: { paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.primary },
  dangerAction: {},
  privacyActionText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm },
  dangerText: { color: COLORS.error },
  aboutLink: { paddingVertical: SPACING.sm },
  aboutLinkText: { color: COLORS.accent, fontSize: TYPOGRAPHY.fontSize.sm },
  version: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.textMuted, marginTop: SPACING.sm },
});

const sectionStyles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary },
});

const rowStyles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.textPrimary },
  empty: { color: COLORS.textMuted },
  input: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingVertical: 4,
  },
});
