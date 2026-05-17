import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, Text, View } from "react-native";
import type { ListingVideo } from "@lobby/shared";

export function ListingVideoBlock({ video, title }: { video: ListingVideo; title: string }) {
  if (!video.url) {
    return null;
  }

  const player = useVideoPlayer(video.url, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.section} accessibilityLabel={`סרטון — ${title}`}>
      <View style={styles.header}>
        <Text style={styles.badge}>סרטון</Text>
        {video.durationSeconds > 0 ? (
          <Text style={styles.duration}>{video.durationSeconds} שנ׳</Text>
        ) : null}
      </View>
      <View style={styles.frame}>
        <VideoView style={styles.video} player={player} nativeControls contentFit="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 14,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  badge: {
    fontSize: 15,
    fontWeight: "900",
    color: "#101820",
  },
  duration: {
    fontSize: 13,
    fontWeight: "700",
    color: "#687076",
  },
  frame: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#101820",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.08)",
  },
  video: {
    width: "100%",
    height: 220,
  },
});
