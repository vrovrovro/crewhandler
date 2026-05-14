import { router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabaseMobile } from "../../lib/supabase";

export default function MobileLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    const { error: signInError } = await supabaseMobile.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.kicker}>FieldFlow OS</Text>
        <Text style={styles.heading}>Technician sign in</Text>
        <Text style={styles.description}>Supabase Auth powers mobile session handling.</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={signIn} style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f5f5f4",
    padding: 20,
  },
  card: {
    borderRadius: 32,
    backgroundColor: "#ffffff",
    padding: 24,
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 3,
    color: "#94a3b8",
  },
  heading: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
  },
  description: {
    marginTop: 8,
    fontSize: 16,
    color: "#64748b",
  },
  input: {
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: "#f5f5f4",
    padding: 16,
    fontSize: 16,
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: "#dc2626",
  },
  button: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  buttonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
