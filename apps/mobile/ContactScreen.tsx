import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SUPPORT_INQUIRY_BODY_MAX,
  SUPPORT_INQUIRY_CATEGORIES,
  SUPPORT_INQUIRY_CATEGORY_LABELS,
  SUPPORT_INQUIRY_SUBJECT_MAX,
  type SupportInquiryCategory,
} from "@lobby/shared";
import { useLobbyAuth } from "./lib/LobbyAuthContext";
import { fetchListingByIdFromFirestore } from "./lib/firebase/listingQueries";
import { isFirebaseConfigured } from "./lib/firebase/isConfigured";
import { submitSupportInquiry } from "./lib/firebase/supportInquiry";
const categoryOptions = SUPPORT_INQUIRY_CATEGORIES.map((id) => ({
  id,
  label: SUPPORT_INQUIRY_CATEGORY_LABELS[id],
}));

export function ContactScreen({
  onClose,
  onSubmitted,
  initialListingId,
}: {
  onClose: () => void;
  onSubmitted?: (inquiryId: string) => void;
  initialListingId?: string | null;
}) {
  const { user, openAuthModal } = useLobbyAuth();
  const [category, setCategory] = useState<SupportInquiryCategory>("technical");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const listingIdFromNav = initialListingId?.trim() ?? "";
  const [listingTitle, setListingTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingIdFromNav || !isFirebaseConfigured()) {
      return;
    }
    let cancelled = false;
    void fetchListingByIdFromFirestore(listingIdFromNav).then((listing) => {
      if (!cancelled && listing) {
        setListingTitle(listing.title);
        setCategory("listing");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listingIdFromNav]);

  const canSubmit = useMemo(
    () => subject.trim().length >= 2 && body.trim().length >= 10 && !submitting,
    [subject, body, submitting],
  );

  async function handleSubmit() {
    setError(null);
    if (!isFirebaseConfigured()) {
      setError("אין חיבור לשרת.");
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitSupportInquiry({
        category,
        subject: subject.trim(),
        body: body.trim(),
        listingId: listingIdFromNav || undefined,
        listingTitle: listingTitle.trim() || undefined,
      });
      if (onSubmitted) {
        onSubmitted(result.inquiryId);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "לא הצלחנו לשלוח את הפנייה.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={onClose} accessibilityRole="button">
          <Text style={styles.back}>← חזרה</Text>
        </Pressable>
        <Text style={styles.title}>יצירת קשר</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!user ? (
          <View style={styles.authBox}>
            <Text style={styles.muted}>יש להתחבר כדי לשלוח פנייה.</Text>
            <Pressable style={styles.primaryBtn} onPress={openAuthModal}>
              <Text style={styles.primaryBtnText}>התחברות</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>קטגוריה</Text>
            <View style={styles.chips}>
              {categoryOptions.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, category === opt.id && styles.chipOn]}
                  onPress={() => setCategory(opt.id)}
                >
                  <Text style={[styles.chipText, category === opt.id && styles.chipTextOn]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>נושא</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              maxLength={SUPPORT_INQUIRY_SUBJECT_MAX}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              placeholderTextColor="#8a9399"
            />

            <Text style={styles.label}>פרטים</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={body}
              onChangeText={setBody}
              maxLength={SUPPORT_INQUIRY_BODY_MAX}
              multiline
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              placeholderTextColor="#8a9399"
            />

            {listingTitle ? (
              <Text style={styles.muted}>הפנייה תקושר למודעה: {listingTitle}</Text>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>שליחת פנייה</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f6f2" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(16,24,32,0.1)",
  },
  back: { fontSize: 15, fontWeight: "800", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "900" },
  scroll: { padding: 16, paddingBottom: 40, gap: 8 },
  label: { fontSize: 14, fontWeight: "800", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.12)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(16,24,32,0.06)",
  },
  chipOn: { backgroundColor: "#101820" },
  chipText: { fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: "#fff" },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#101820",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  muted: { fontSize: 14, color: "#5c676d", marginTop: 4 },
  error: { color: "#b42318", fontWeight: "700", marginTop: 8 },
  successBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(8,184,200,0.12)",
  },
  successText: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  authBox: { gap: 12 },
});
