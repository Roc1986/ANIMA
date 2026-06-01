import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface Message {
  id: string;
  text: string;
  from: 'user' | 'anima';
}

const MOCK_RESPONSES = [
  'Las estrellas sugieren que este es un momento de transición importante en tu vida. Confía en tu intuición.',
  'Veo que el arcano de La Luna está muy presente en tu energía hoy. Los misterios se revelarán pronto.',
  'Tu carta astral indica una oportunidad de crecimiento espiritual. Abre tu corazón a lo nuevo.',
  'El universo te habla a través de señales sutiles. Presta atención a los sueños y sincronías.',
  'Saturno en tu carta natal sugiere que las lecciones actuales son parte de tu camino de evolución.',
];

const WELCOME: Message = {
  id: '0',
  text: '✨ Hola, soy ANIMA. Estoy aquí para acompañarte en tu camino espiritual. ¿Qué tienes en mente hoy?',
  from: 'anima',
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), text, from: 'user' };
    const animaResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    const animaMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: animaResponse,
      from: 'anima',
    };

    setMessages((prev) => [...prev, userMsg, animaMsg]);
    setInputText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.from === 'user' ? styles.bubbleUser : styles.bubbleAnima]}>
      {item.from === 'anima' && <Text style={styles.animaLabel}>ANIMA</Text>}
      <Text style={[styles.bubbleText, item.from === 'user' && styles.bubbleTextUser]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ANIMA</Text>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={11} color={COLORS.success} />
            <Text style={styles.privacyText}>Conversación privada y encriptada</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  privacyText: { fontSize: 11, color: COLORS.textMuted },
  messageList: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  bubbleAnima: {
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  animaLabel: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bubbleText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  bubbleTextUser: { color: COLORS.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
