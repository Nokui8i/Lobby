import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ThreadRowMenu({
  deleteLabel,
  onDeletePress,
}: {
  deleteLabel: string;
  onDeletePress: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<View>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => setOpen(false), 8000);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <View ref={rootRef} style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="אפשרויות שיחה"
        hitSlop={8}
        style={styles.trigger}
        onPress={(event) => {
          event.stopPropagation?.();
          setOpen((value) => !value);
        }}
      >
        <Text style={styles.dots}>⋮</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          <Pressable
            style={styles.menuItem}
            onPress={(event) => {
              event.stopPropagation?.();
              setOpen(false);
              onDeletePress();
            }}
          >
            <Text style={styles.menuItemText}>{deleteLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    zIndex: 2,
  },
  trigger: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    fontSize: 20,
    fontWeight: "900",
    color: "#5c6670",
    lineHeight: 22,
  },
  menu: {
    position: "absolute",
    top: 30,
    left: 0,
    minWidth: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(16,24,32,0.12)",
    paddingVertical: 4,
    shadowColor: "#101820",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#c62828",
    textAlign: "right",
  },
});
