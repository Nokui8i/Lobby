import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useLobbyAuth } from "../lib/LobbyAuthContext";
import { isFirebaseConfigured } from "../lib/firebase/isConfigured";

export function LobbyAuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    completeGoogleProfileAfterSignIn,
    abandonPendingGoogleProfile,
  } = useLobbyAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [googleAwaitingName, setGoogleAwaitingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refName = useRef<TextInput>(null);
  const refEmail = useRef<TextInput>(null);
  const refPassword = useRef<TextInput>(null);
  const refGoogleName = useRef<TextInput>(null);

  useEffect(() => {
    if (!authModalOpen) {
      void abandonPendingGoogleProfile();
      setGoogleAwaitingName(false);
      setError(null);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setMode("signin");
      setBusy(false);
    }
  }, [authModalOpen, abandonPendingGoogleProfile]);

  function requestClose() {
    void abandonPendingGoogleProfile().finally(() => {
      closeAuthModal();
    });
  }

  if (!authModalOpen || !isFirebaseConfigured()) {
    return null;
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          setError("נא למלא שם להצגה.");
          return;
        }
        await signUpWithEmail(email, password, displayName.trim());
      }

      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      const message =
        code === "lobby/use-google"
          ? "האימייל רשום עם Google — התחברו עם Google."
          : code === "lobby/wrong-email-password"
            ? "אימייל או סיסמה לא נכונים."
            : code === "lobby/signin-email-or-google"
              ? "אימייל או סיסמה לא נכונים, או Google — נסו התחברות עם Google."
              : code === "lobby/register-use-google"
                ? "האימייל כבר רשום עם Google — השתמשו בכפתור Google."
                : code === "lobby/email-in-use-generic"
                  ? "האימייל כבר רשום. עם Google? התחברו עם Google. עם סיסמה? ׳יש לי חשבון׳."
                  : code === "lobby/display-name-required"
                    ? "נא למלא שם להצגה."
                    : code === "auth/invalid-email"
                      ? "כתובת האימייל לא תקינה."
                      : code === "auth/weak-password"
                        ? "סיסמה חלשה מדי."
                        : code === "auth/email-already-in-use"
                          ? "האימייל כבר רשום — נסו Google או כניסה."
                          : "לא הצלחנו להשלים. נסו שוב.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteGoogleName() {
    setError(null);
    if (!displayName.trim()) {
      setError("נא למלא שם להצגה.");
      return;
    }
    setBusy(true);
    try {
      await completeGoogleProfileAfterSignIn(displayName.trim());
      setGoogleAwaitingName(false);
      setDisplayName("");
      setEmail("");
      setPassword("");
    } catch {
      setError("לא הצלחנו לשמור. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  if (googleAwaitingName) {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={requestClose}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.backdrop} pointerEvents="none" />
          <View style={styles.panel}>
            <View style={styles.headerRow}>
              <Pressable onPress={requestClose} accessibilityRole="button" accessibilityLabel="סגירה">
                <Text style={styles.close}>×</Text>
              </Pressable>
              <View style={styles.headerText}>
                <Text style={styles.title}>כמעט סיימנו</Text>
                <Text style={styles.subtitle}>בחרו איך תופיעו בלובי.</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>שם להצגה</Text>
            <TextInput
              ref={refGoogleName}
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              textAlign="right"
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={() => void handleCompleteGoogleName()}
              accessibilityLabel="שם להצגה"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.submit, busy && styles.submitDisabled]}
              disabled={busy}
              onPress={() => void handleCompleteGoogleName()}
            >
              <Text style={styles.submitText}>{busy ? "שומרים…" : "המשך ללובי"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={requestClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.backdrop} pointerEvents="none" />
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <Pressable onPress={requestClose} accessibilityRole="button" accessibilityLabel="סגירה">
              <Text style={styles.close}>×</Text>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.title}>{mode === "signin" ? "כניסה ללובי" : "הרשמה ללובי"}</Text>
              <Text style={styles.subtitle}>נדרש חשבון לדיווח, צ׳אט ופרסום.</Text>
            </View>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeBtn, mode === "signin" && styles.modeBtnActive]}
              onPress={() => {
                setMode("signin");
                setError(null);
              }}
            >
              <Text style={styles.modeBtnText}>יש לי חשבון</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === "signup" && styles.modeBtnActive]}
              onPress={() => {
                setMode("signup");
                setError(null);
              }}
            >
              <Text style={styles.modeBtnText}>חדשים</Text>
            </Pressable>
          </View>

          {mode === "signup" ? (
            <>
              <Text style={styles.fieldLabel}>שם להצגה</Text>
              <TextInput
                ref={refName}
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                textAlign="right"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => refEmail.current?.focus()}
                accessibilityLabel="שם להצגה"
              />
            </>
          ) : null}

          <Text style={styles.fieldLabel}>אימייל</Text>
          <TextInput
            ref={refEmail}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="left"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refPassword.current?.focus()}
            accessibilityLabel="אימייל"
          />

          <Text style={styles.fieldLabel}>סיסמה</Text>
          <TextInput
            ref={refPassword}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign="left"
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={() => void handleSubmit()}
            accessibilityLabel="סיסמה"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GoogleSignInButton
            intent={mode}
            signupDisplayName={displayName}
            emailHint={email.trim() || undefined}
            onError={setError}
            busy={busy}
            onNeedsDisplayName={() => {
              setGoogleAwaitingName(true);
              setDisplayName("");
              setError(null);
            }}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.submit, busy && styles.submitDisabled]}
            disabled={busy}
            onPress={() => void handleSubmit()}
          >
            <Text style={styles.submitText}>{busy ? "מעבדים…" : mode === "signin" ? "כניסה" : "יצירת חשבון"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(16,24,32,0.35)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#fff",
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#101820",
    textAlign: "right",
    marginBottom: -4,
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
  },
  close: {
    fontSize: 28,
    fontWeight: "700",
    color: "#101820",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#101820",
    textAlign: "right",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#5c6670",
    textAlign: "right",
    lineHeight: 20,
  },
  modeRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#f7f6f2",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
  },
  modeBtnActive: {
    borderColor: "rgba(8,184,200,0.45)",
    backgroundColor: "rgba(8,184,200,0.12)",
  },
  modeBtnText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#065a63",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fbfaf7",
  },
  error: {
    color: "#a21e2e",
    fontWeight: "700",
    textAlign: "right",
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(16,24,32,0.12)",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5c6670",
  },
  submit: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#101820",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});
