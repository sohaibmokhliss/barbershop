import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { LocalAppointment, MobileSession, QueueOperation } from '../types';

const APPOINTMENTS_KEY = 'barbershop.appointments';
const QUEUE_KEY = 'barbershop.queue';
const CURSOR_KEY = 'barbershop.cursor';
const SERVER_URL_KEY = 'barbershop.serverUrl';
const SESSION_KEY = 'barbershop.session';

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function loadAppointments(): Promise<LocalAppointment[]> {
  return parseJson(await AsyncStorage.getItem(APPOINTMENTS_KEY), []);
}

export async function saveAppointments(items: LocalAppointment[]) {
  await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(items));
}

export async function loadQueue(): Promise<QueueOperation[]> {
  return parseJson(await AsyncStorage.getItem(QUEUE_KEY), []);
}

export async function saveQueue(items: QueueOperation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function loadCursor(): Promise<string | null> {
  return await AsyncStorage.getItem(CURSOR_KEY);
}

export async function saveCursor(value: string | null) {
  if (!value) {
    await AsyncStorage.removeItem(CURSOR_KEY);
    return;
  }
  await AsyncStorage.setItem(CURSOR_KEY, value);
}

export async function loadServerUrl(): Promise<string> {
  return (await AsyncStorage.getItem(SERVER_URL_KEY)) ?? '';
}

export async function saveServerUrl(value: string) {
  await AsyncStorage.setItem(SERVER_URL_KEY, value);
}

export async function loadSession(): Promise<MobileSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return parseJson(raw, null);
}

export async function saveSession(session: MobileSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
