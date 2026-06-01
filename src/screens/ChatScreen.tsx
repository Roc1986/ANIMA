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

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ANIMA_RESPONSES = [
  'Las estrellas iluminan tu camino. Confía en tu intuición y en la sabiduría que llevas dentro.',
  'El universo siempre conspira a tu favor. Cada experiencia es una lección disfrazada de regalo.',
  'Tu energía es poderosa. Recuerda que eres un ser de luz capaz de transformar cualquier situación.',
  'Los planetas están alineados para apoyarte. Es momento de soltar lo que ya no te sirve.',
  'La luna llena ilumina tus emociones más profundas. Escúchalas con compasión.',
];

let messageIdCounter = 2;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hola, soy ANIMA. ¿Sobre qué te gustaría reflexionar hoy?',
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = {
      id: String(messageIdCounter++),
      text,
      isUser: true,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const response = ANIMA_RESPONSES[Math.floor(Math.random() * ANIMA_RESPONSES.length)];
      const animaMsg: Message = {
        id: String(messageIdCounter++),
        text: response,
        isUser: false,
      };
      setMessages(prev => [...prev, animaMsg]);
    }, 800);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.animaRow]}>
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ANIMA</Text>
          <Text style={styles.headerSubtitle}>🔒 Privado y encriptado</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor="#6D6D8A"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0A1E',
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D1B69',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6D6D8A',
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  animaRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#7C3AED',
  },
  animaBubble: {
    backgroundColor: '#1A1035',
    borderWidth: 1,
    borderColor: '#2D1B69',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  animaText: {
    color: '#C4B5FD',
  },
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
