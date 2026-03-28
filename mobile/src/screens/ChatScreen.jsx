import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import api from '../utils/api';
import { getSocket, joinMatchRoom, leaveMatchRoom, sendMessage, startTyping, stopTyping } from '../utils/socket';
import useAuthStore from '../hooks/useAuth';

export default function ChatScreen({ route, navigation }) {
  const { match_id, name, photo } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeout = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/${match_id}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    }
  }, [match_id]);

  useEffect(() => {
    fetchMessages();
    joinMatchRoom(match_id);
    const socket = getSocket();

    socket?.on('message:new', (msg) => {
      if (msg.match_id === match_id) {
        setMessages(prev => [...prev, msg]);
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    });

    socket?.on('typing:start', ({ user_id }) => {
      if (user_id !== user.id) setIsTyping(true);
    });
    socket?.on('typing:stop', ({ user_id }) => {
      if (user_id !== user.id) setIsTyping(false);
    });

    return () => {
      leaveMatchRoom(match_id);
      socket?.off('message:new');
      socket?.off('typing:start');
      socket?.off('typing:stop');
    };
  }, [match_id, fetchMessages, user.id]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    stopTyping(match_id);
    sendMessage(match_id, text);
    // Optimistic update
    const optimistic = {
      id: Date.now().toString(),
      match_id,
      sender_id: user.id,
      sender_name: user.name,
      content: text,
      type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleTyping = (text) => {
    setInput(text);
    startTyping(match_id);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => stopTyping(match_id), 1500);
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === user.id;
    const isSystem = item.type === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.avatarSpace}>
            {showAvatar && (
              photo
                ? <Image source={{ uri: photo }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{name[0]}</Text>
                  </View>
            )}
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={Colors.dark} />
        </TouchableOpacity>
        {photo
          ? <Image source={{ uri: photo }} style={styles.headerPhoto} />
          : <View style={[styles.headerPhoto, { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>{name[0]}</Text>
            </View>
        }
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={styles.headerName}>{name}</Text>
          {isTyping && <Text style={styles.typingText}>typing...</Text>}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProposeHangout', { match_id, name })}
        >
          <Ionicons name="calendar-outline" size={24} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleTyping}
            placeholder="Message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  headerPhoto: { width: 38, height: 38, borderRadius: 19, marginLeft: Spacing.sm },
  headerName: { ...Typography.h3, fontSize: 16 },
  typingText: { ...Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.xl },
  systemMsg: {
    backgroundColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'center', marginVertical: Spacing.sm,
  },
  systemMsgText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  avatarSpace: { width: 32, marginRight: 6, alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  bubble: {
    maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  bubbleText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: Colors.white },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: Spacing.sm, borderTopWidth: 1,
    borderTopColor: Colors.border, backgroundColor: Colors.white,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, backgroundColor: Colors.background,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center',
    justifyContent: 'center', marginLeft: Spacing.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
