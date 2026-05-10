import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar as NativeStatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useBarberApp } from './src/hooks/useBarberApp';
import type { AppointmentDraft, LocalAppointment, ViewMode } from './src/types';

type EditorState = {
  mode: 'create' | 'edit';
  appointmentId: string | null;
  values: AppointmentDraft;
};

const EMPTY_DRAFT: AppointmentDraft = {
  clientName: '',
  clientPhone: '',
  startsAt: '',
  service: '',
  notes: '',
};

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatDateKey(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatMonthLabel(value: Date): string {
  return value.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDayNumber(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
  });
}

function getDateOnly(value: string): string {
  return value.slice(0, 10);
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function startOfCalendarGrid(value: Date): Date {
  const firstDay = startOfMonth(value);
  const weekday = firstDay.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() + diff);
  return gridStart;
}

function buildCalendarDays(value: Date): string[] {
  const gridStart = startOfCalendarGrid(value);
  const monthEnd = endOfMonth(value);
  const days: string[] = [];
  const cursor = new Date(gridStart);

  while (days.length < 42) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    if (cursor > monthEnd && cursor.getDay() === 1 && days.length >= 35) {
      break;
    }
  }

  return days;
}

function chunkDays(days: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < days.length; index += size) {
    chunks.push(days.slice(index, index + size));
  }
  return chunks;
}

function sameMonth(dateKey: string, value: Date): boolean {
  const date = new Date(dateKey);
  return (
    date.getFullYear() === value.getFullYear() &&
    date.getMonth() === value.getMonth()
  );
}

function pendingLabel(appointment: LocalAppointment): string | null {
  if (appointment.syncError) return 'Erreur sync';
  if (appointment.pendingAction === 'create') return 'Nouveau';
  if (appointment.pendingAction === 'update') return 'Modifié hors ligne';
  if (appointment.pendingAction === 'delete') return 'Suppression en attente';
  return null;
}

function groupAppointments(items: LocalAppointment[]) {
  const map = new Map<string, LocalAppointment[]>();
  for (const item of items) {
    const key = getDateOnly(item.startsAt);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function syncCopy(syncStatus: string, syncError: string | null) {
  if (syncStatus === 'syncing') {
    return {
      title: 'Synchronisation en cours',
      body: 'Les changements locaux sont en train d’être envoyés au serveur.',
      tone: 'syncing' as const,
      button: 'Sync...',
    };
  }

  if (syncStatus === 'error') {
    return {
      title: 'Synchronisation bloquée',
      body: syncError ?? 'Une erreur de synchronisation doit être relancée.',
      tone: 'error' as const,
      button: 'Relancer',
    };
  }

  return {
    title: 'Synchronisation prête',
    body: 'Les rendez-vous se sauvegardent localement et se propagent dès que le téléphone retrouve la connexion.',
    tone: 'ready' as const,
    button: 'Synchroniser',
  };
}

function ScreenShell({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={[styles.pageContent, style]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen({
  login,
  password,
  setLogin,
  setPassword,
  onSubmit,
  loading,
  error,
}: {
  login: string;
  password: string;
  setLogin: (value: string) => void;
  setPassword: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <ScreenShell style={styles.loginContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.heroCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>✂</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Offline ready</Text>
            </View>
          </View>

          <Text style={styles.kicker}>Barbershop control desk</Text>
          <Text style={styles.loginTitle}>Barbershop Yassine</Text>
          <Text style={styles.loginSubtitle}>
            Take reservations on iPhone, save them locally, and sync later when the phone gets
            internet.
          </Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Local saves</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Auto sync</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>iPhone friendly</Text>
            </View>
          </View>
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelLabel}>Connexion</Text>
          <Text style={styles.panelCopy}>
            Connectez-vous avec le compte du barber. La synchronisation utilise déjà
            le serveur du salon.
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Identifiant</Text>
            <TextInput
              value={login}
              onChangeText={setLogin}
              placeholder="Nom d’utilisateur"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function AppointmentEditor({
  visible,
  editor,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  visible: boolean;
  editor: EditorState | null;
  onChange: (patch: Partial<AppointmentDraft>) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!editor) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editor.mode === 'create' ? 'Nouveau rendez-vous' : 'Modifier le rendez-vous'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Saisie locale immédiate, synchronisation automatique dès que la connexion revient.
            </Text>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nom du client</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du client"
                  placeholderTextColor="#94a3b8"
                  value={editor.values.clientName}
                  onChangeText={(value) => onChange({ clientName: value })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Téléphone"
                  placeholderTextColor="#94a3b8"
                  value={editor.values.clientPhone}
                  onChangeText={(value) => onChange({ clientPhone: value })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Date / heure ISO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-04-16T13:30:00.000Z"
                  placeholderTextColor="#94a3b8"
                  value={editor.values.startsAt}
                  onChangeText={(value) => onChange({ startsAt: value })}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Service</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Coupe, barbe, rasage..."
                  placeholderTextColor="#94a3b8"
                  value={editor.values.service}
                  onChangeText={(value) => onChange({ service: value })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Commentaires, préférences, détails..."
                  placeholderTextColor="#94a3b8"
                  value={editor.values.notes}
                  multiline
                  onChangeText={(value) => onChange({ notes: value })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={onCancel}>
                <Text style={styles.secondaryButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, styles.modalSaveButton, saving && styles.buttonDisabled]}
                onPress={onSave}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>✂</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <Pressable style={styles.emptyAction} onPress={onAction}>
        <Text style={styles.primaryButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
}: {
  appointment: LocalAppointment;
  onEdit: (appointment: LocalAppointment) => void;
  onDelete: (appointment: LocalAppointment) => void;
}) {
  const badge = pendingLabel(appointment);
  const accentStyle = appointment.syncError
    ? styles.cardAccentError
    : appointment.pendingAction
      ? styles.cardAccentPending
      : styles.cardAccentReady;

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, accentStyle]} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{appointment.clientName}</Text>
            <Text style={styles.cardSubtitle}>{formatDateTime(appointment.startsAt)}</Text>
          </View>

          {badge ? (
            <View
              style={[
                styles.badge,
                appointment.syncError ? styles.badgeError : styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  appointment.syncError ? styles.badgeErrorText : styles.badgePendingText,
                ]}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaStack}>
          {appointment.service ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Service</Text>
              <Text style={styles.metaValue}>{appointment.service}</Text>
            </View>
          ) : null}
          {appointment.clientPhone ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Téléphone</Text>
              <Text style={styles.metaValue}>{appointment.clientPhone}</Text>
            </View>
          ) : null}
          {appointment.notes ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Notes</Text>
              <Text style={styles.metaValue}>{appointment.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => onEdit(appointment)}>
            <Text style={styles.secondaryButtonText}>Modifier</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={() => onDelete(appointment)}>
            <Text style={styles.dangerButtonText}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const {
    ready,
    auth,
    syncStatus,
    syncError,
    pendingCount,
    visibleAppointments,
    signIn,
    signOut,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    deletePastAppointments,
    syncNow,
    isSigningIn,
    isMutating,
    authError,
  } = useBarberApp();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const groupedAppointments = useMemo(
    () => groupAppointments(visibleAppointments),
    [visibleAppointments],
  );
  const appointmentsByDate = useMemo(
    () => new Map(groupedAppointments),
    [groupedAppointments],
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const calendarWeeks = useMemo(
    () => chunkDays(calendarDays, 7),
    [calendarDays],
  );
  const selectedDayAppointments = useMemo(
    () => appointmentsByDate.get(selectedCalendarDate) ?? [],
    [appointmentsByDate, selectedCalendarDate],
  );

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingTitle}>Chargement de l’espace de travail...</Text>
        <Text style={styles.loadingText}>Préparation des données locales et de la synchro.</Text>
      </SafeAreaView>
    );
  }

  if (!auth) {
    return (
      <LoginScreen
        login={login}
        password={password}
        setLogin={setLogin}
        setPassword={setPassword}
        loading={isSigningIn}
        error={authError}
        onSubmit={() => void signIn(login, password)}
      />
    );
  }

  function startCreate() {
    setEditor({
      mode: 'create',
      appointmentId: null,
      values: EMPTY_DRAFT,
    });
  }

  function startEdit(appointment: LocalAppointment) {
    setEditor({
      mode: 'edit',
      appointmentId: appointment.id,
      values: {
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone ?? '',
        startsAt: appointment.startsAt,
        service: appointment.service ?? '',
        notes: appointment.notes ?? '',
      },
    });
  }

  async function saveEditor() {
    if (!editor) return;
    if (editor.mode === 'create') {
      await createAppointment(editor.values);
    } else if (editor.appointmentId) {
      await updateAppointment(editor.appointmentId, editor.values);
    }
    setEditor(null);
  }

  function confirmDeletePastAppointments() {
    Alert.alert(
      'Supprimer les anciens rendez-vous',
      'Les rendez-vous passés seront retirés du téléphone et supprimés au prochain sync.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deletePastAppointments();
          },
        },
      ],
    );
  }

  const syncState = syncCopy(syncStatus, syncError);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <AppointmentEditor
        visible={Boolean(editor)}
        editor={editor}
        saving={isMutating}
        onChange={(patch) =>
          setEditor((current) =>
            current ? { ...current, values: { ...current.values, ...patch } } : current,
          )
        }
        onCancel={() => setEditor(null)}
        onSave={() => void saveEditor()}
      />

      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.kicker}>Barbershop control desk</Text>
              <Text style={styles.heroTitle}>Yassine iPhone</Text>
              <Text style={styles.heroSubtitle}>
                {auth.username} · {pendingCount} changement(s) en attente
              </Text>
            </View>
          </View>
          <View style={styles.heroActionsRow}>
            <Pressable style={styles.softActionButton} onPress={confirmDeletePastAppointments}>
              <Text style={styles.softActionText}>Supprimer anciens</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={() => void signOut()}>
              <Text style={styles.ghostButtonText}>Déconnexion</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncCopy}>
            <View style={styles.syncHeaderRow}>
              <View
                style={[
                  styles.syncDot,
                  syncState.tone === 'syncing'
                    ? styles.syncDotSyncing
                    : syncState.tone === 'error'
                      ? styles.syncDotError
                      : styles.syncDotReady,
                ]}
              />
              <Text style={styles.syncTitle}>{syncState.title}</Text>
            </View>
            <Text style={styles.syncDescription}>{syncState.body}</Text>
          </View>

          <Pressable
            style={[styles.primaryButtonSmall, syncStatus === 'syncing' && styles.buttonDisabled]}
            onPress={() => void syncNow()}
            disabled={syncStatus === 'syncing'}
          >
            <Text style={styles.primaryButtonText}>{syncState.button}</Text>
          </Pressable>
        </View>

        {syncError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{syncError}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{pendingCount}</Text>
            <Text style={styles.metricLabel}>En attente</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{visibleAppointments.length}</Text>
            <Text style={styles.metricLabel}>Rendez-vous</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{groupedAppointments.length}</Text>
            <Text style={styles.metricLabel}>Journées</Text>
          </View>
        </View>

        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segmentButton, viewMode === 'list' && styles.segmentButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === 'list' && styles.segmentButtonTextActive,
              ]}
            >
              Rendez-vous
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, viewMode === 'calendar' && styles.segmentButtonActive]}
            onPress={() => {
              setViewMode('calendar');
              const selected = new Date(selectedCalendarDate);
              setCalendarMonth(startOfMonth(selected));
            }}
          >
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === 'calendar' && styles.segmentButtonTextActive,
              ]}
            >
              Calendrier
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.addButton} onPress={startCreate}>
          <Text style={styles.addButtonText}>+ Nouveau rendez-vous</Text>
        </Pressable>

        {viewMode === 'list' ? (
          visibleAppointments.length ? (
            visibleAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onEdit={startEdit}
                onDelete={(item) => void deleteAppointment(item.id)}
              />
            ))
          ) : (
            <EmptyState
              title="Aucun rendez-vous pour le moment"
              body="Ajoute le premier rendez-vous pour remplir la journée. Tout reste enregistré localement si la connexion coupe."
              actionLabel="Créer un rendez-vous"
              onAction={startCreate}
            />
          )
        ) : (
          <View style={styles.calendarCard}>
            <View style={styles.calendarToolbar}>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
              >
                <Text style={styles.calendarNavText}>←</Text>
              </Pressable>
              <Text style={styles.calendarMonthLabel}>
                {formatMonthLabel(calendarMonth)}
              </Text>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
              >
                <Text style={styles.calendarNavText}>→</Text>
              </Pressable>
            </View>

            <View style={styles.calendarWeekRow}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.calendarWeekday}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.calendarWeekCellsRow}>
                  {week.map((dateKey) => {
                    const count = (appointmentsByDate.get(dateKey) ?? []).length;
                    const active = selectedCalendarDate === dateKey;
                    const inMonth = sameMonth(dateKey, calendarMonth);

                    return (
                      <Pressable
                        key={dateKey}
                        style={[
                          styles.calendarCell,
                          active && styles.calendarCellActive,
                          !inMonth && styles.calendarCellMuted,
                        ]}
                        onPress={() => setSelectedCalendarDate(dateKey)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            active && styles.calendarDayTextActive,
                            !inMonth && styles.calendarDayTextMuted,
                          ]}
                        >
                          {formatDayNumber(dateKey)}
                        </Text>
                        <View
                          style={[
                            styles.calendarCountPill,
                            count > 0 && styles.calendarCountPillFilled,
                            active && styles.calendarCountPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarCountPillText,
                              count > 0 && styles.calendarCountPillTextFilled,
                              active && styles.calendarCountPillTextActive,
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.calendarDetailHeader}>
              <Text style={styles.calendarTitle}>{formatDateKey(selectedCalendarDate)}</Text>
              <Text style={styles.calendarCount}>
                {selectedDayAppointments.length} rdv
              </Text>
            </View>

            {selectedDayAppointments.length ? (
              <View style={styles.calendarGroupList}>
                {selectedDayAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={startEdit}
                    onDelete={(item) => void deleteAppointment(item.id)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="Aucun rendez-vous ce jour"
                body="Choisis une autre date ou crée un nouveau rendez-vous pour remplir le calendrier."
                actionLabel="Créer un rendez-vous"
                onAction={startCreate}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === 'android'
        ? (NativeStatusBar.currentHeight ?? 0) + 18
        : 28,
    paddingBottom: 32,
    gap: 14,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#f5d0fe',
    opacity: 0.28,
  },
  glowBottom: {
    position: 'absolute',
    left: -120,
    bottom: 100,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: '#bfdbfe',
    opacity: 0.22,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
    gap: 10,
    padding: 24,
  },
  loadingTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    color: '#64748b',
    textAlign: 'center',
  },
  loginContent: {
    justifyContent: 'center',
    paddingVertical: 24,
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 28,
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  heroTopRow: {
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 24,
  },
  heroBadge: {
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  kicker: {
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '700',
  },
  loginTitle: {
    color: '#0f172a',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  loginSubtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  heroSubtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: '#3730a3',
    fontWeight: '700',
    fontSize: 12,
  },
  panelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  panelLabel: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  panelCopy: {
    color: '#64748b',
    lineHeight: 21,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6deea',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: 15,
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  errorBanner: {
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButton: {
    minWidth: 140,
  },
  primaryButtonSmall: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    textAlign: 'center',
    fontWeight: '800',
  },
  ghostButton: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
  softActionButton: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  softActionText: {
    color: '#92400e',
    fontWeight: '800',
    fontSize: 12,
  },
  dangerButton: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#991b1b',
    textAlign: 'center',
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  syncCopy: {
    flex: 1,
    gap: 6,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  syncDotReady: {
    backgroundColor: '#16a34a',
  },
  syncDotSyncing: {
    backgroundColor: '#2563eb',
  },
  syncDotError: {
    backgroundColor: '#dc2626',
  },
  syncTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
  syncDescription: {
    color: '#64748b',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
  },
  segmentButtonActive: {
    backgroundColor: '#0f172a',
  },
  segmentButtonText: {
    textAlign: 'center',
    color: '#334155',
    fontWeight: '800',
  },
  segmentButtonTextActive: {
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: 26,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: 6,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  calendarGroupCard: {
    gap: 12,
  },
  calendarCard: {
    gap: 16,
  },
  calendarToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '800',
  },
  calendarMonthLabel: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  calendarWeekday: {
    width: '14%',
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  calendarGrid: {
    gap: 8,
  },
  calendarWeekCellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarCell: {
    width: '13.4%',
    aspectRatio: 0.84,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  calendarCellActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  calendarCellMuted: {
    opacity: 0.42,
  },
  calendarDayText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  calendarDayTextActive: {
    color: '#ffffff',
  },
  calendarDayTextMuted: {
    color: '#64748b',
  },
  calendarCountPill: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  calendarCountPillFilled: {
    backgroundColor: '#dbeafe',
  },
  calendarCountPillActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  calendarCountPillText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  calendarCountPillTextFilled: {
    color: '#1d4ed8',
  },
  calendarCountPillTextActive: {
    color: '#ffffff',
  },
  calendarDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  calendarGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  calendarCount: {
    color: '#64748b',
    fontWeight: '700',
  },
  calendarGroupList: {
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardAccent: {
    height: 6,
  },
  cardAccentReady: {
    backgroundColor: '#0f172a',
  },
  cardAccentPending: {
    backgroundColor: '#f59e0b',
  },
  cardAccentError: {
    backgroundColor: '#dc2626',
  },
  cardBody: {
    padding: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    color: '#475569',
    fontWeight: '600',
  },
  metaStack: {
    gap: 8,
  },
  metaRow: {
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    color: '#0f172a',
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeError: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgePendingText: {
    color: '#92400e',
  },
  badgeErrorText: {
    color: '#991b1b',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 12,
    maxHeight: '92%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    color: '#64748b',
    lineHeight: 20,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    gap: 14,
    paddingBottom: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
});
