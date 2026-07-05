import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ANIMA_RESPONSES = [
  'Las estrellas iluminan tu camino. Confía en tu intuición y en la sabiduría que llevas dentro. Cada pregunta que surge en ti es una invitación a profundizar en tu verdad más auténtica.',
  'El universo siempre conspira a tu favor. Cada experiencia es una lección disfrazada de regalo, y lo que ahora parece un obstáculo pronto revelará su propósito transformador.',
  'Tu energía es poderosa y merece ser honrada. Recuerda que eres un ser de luz capaz de transformar cualquier situación desde el amor. Empieza por la compasión hacia ti mismo.',
  'Los planetas están alineando sus fuerzas para apoyarte en este momento. Es tiempo de soltar lo que ya no te sirve y abrazar la versión de ti que está emergiendo con más claridad.',
  'La luna llena ilumina tus emociones más profundas como un espejo de agua en la noche. Escúchalas sin juzgarlas, pues cada sentimiento es un mensajero con sabiduría valiosa.',
  'Tu alma eligió este momento preciso para existir. Las sincronías que aparecen en tu vida no son casualidades sino señales del tejido invisible que conecta todo lo que es.',
];

const SUGGESTED_TOPICS = [
  { label: 'Amor y relaciones', emoji: '💕' },
  { label: 'Mi propósito', emoji: '🌟' },
  { label: 'Desafíos actuales', emoji: '🌊' },
  { label: 'Salud y bienestar', emoji: '🌿' },
  { label: 'Trabajo y dinero', emoji: '✨' },
];

let messageIdCounter = 2;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hola, soy ANIMA. ¿Sobre qué te gustaría reflexionar hoy? Puedes elegir un tema o escribir libremente.',
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [responseIndex, setResponseIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text) return;

    Keyboard.dismiss();

    const userMsg: Message = {
      id: String(messageIdCounter++),
      text,
      isUser: true,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const response = ANIMA_RESPONSES[responseIndex % ANIMA_RESPONSES.length];
      setResponseIndex(prev => prev + 1);
      const animaMsg: Message = {
        id: String(messageIdCounter++),
        text: response,
        isUser: false,
      };
      setMessages(prev => [...prev, animaMsg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 800);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.animaRow]}>
      {!item.isUser && (
        <View style={styles.animaAvatar}>
          <Text style={styles.animaAvatarText}>A</Text>
        </View>
      )}
      <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.animaBubble]}>
        <Text style={[styles.bubbleText, item.isUser ? styles.userText : styles.animaText]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ANIMA</Text>
          <Text style={styles.headerSubtitle}>🔒 Privado y encriptado</Text>
        </View>

        {/* Topic chips — altura fija */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTED_TOPICS.map((topic, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => sendMessage(`${topic.label} ${topic.emoji}`)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipEmoji}>{topic.emoji}</Text>
                <Text style={styles.chipText}>{topic.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Mensajes — toca aquí para bajar teclado */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </TouchableWithoutFeedback>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor="#6D6D8A"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              activeOpacity={0.8}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0A1E' },
  safe: { flex: 1 },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D1B69',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 4 },
  headerSubtitle: { fontSize: 11, color: '#6D6D8A', marginTop: 2 },

  // Chips con altura fija
  chipsContainer: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1035',
  },
  chipsRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    gap: 4,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { color: '#C4B5FD', fontSize: 12, fontWeight: 'bold' },

  // Mensajes
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: { marginBottom: 14, flexDirection: 'row', alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  animaRow: { justifyContent: 'flex-start', gap: 8 },
  animaAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  animaAvatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  userBubble: { backgroundColor: '#7C3AED' },
  animaBubble: {
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  userText: { color: '#FFFFFF' },
  animaText: { color: '#C4B5FD' },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D1B69',
    backgroundColor: '#0F0A1E',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1035',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2D1B69',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#3D2B7A' },
  sendIcon: { color: '#FFFFFF', fontSize: 16 },
});
