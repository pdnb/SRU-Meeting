import { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItem,
} from "react-native";
import {
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useSpeakingParticipants,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { gridColumnsForCount } from "./meeting-layout";
import {
  IOS_PIP_OPTIONS,
  selectPipParticipantIdentity,
  shouldEnableIosPip,
} from "./pip-logic";
import {
  nextMicrophoneEnabled,
  shouldShowModeratorChrome,
} from "./token-grant";

type MeetingGridProps = {
  /** Existing join JWT — moderator chrome reads roomAdmin from this token only. */
  token: string;
  onLeave: () => void;
  error: string | null;
};

export function MeetingGrid({ token, onLeave, error }: MeetingGridProps) {
  const { width } = useWindowDimensions();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const speakers = useSpeakingParticipants();
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const showModeratorChrome = shouldShowModeratorChrome(token);
  const columns = gridColumnsForCount(Math.max(tracks.length, 1));
  const tileWidth = (width - 24 - (columns - 1) * 8) / columns;

  const pipIdentity = useMemo(
    () =>
      selectPipParticipantIdentity({
        speakingIdentities: speakers.map(
          (participant) => participant.identity,
        ),
        localIdentity: localParticipant.identity,
        participantIdentities: tracks.map(
          (track) => track.participant.identity,
        ),
      }),
    [localParticipant.identity, speakers, tracks],
  );

  const data = useMemo(() => tracks, [tracks]);

  async function toggleMute() {
    await localParticipant.setMicrophoneEnabled(
      nextMicrophoneEnabled(isMicrophoneEnabled),
    );
  }

  const renderTile: ListRenderItem<TrackReferenceOrPlaceholder> = ({
    item,
  }) => {
    const label =
      item.participant.name || item.participant.identity || "Participant";
    const isLocal = item.participant.isLocal;
    const micOn = isLocal
      ? isMicrophoneEnabled
      : item.participant.isMicrophoneEnabled;

    return (
      <View style={[styles.tile, { width: tileWidth }]}>
        {isTrackReference(item) ? (
          <VideoTrack
            trackRef={item}
            style={styles.video}
            iosPIP={
              shouldEnableIosPip(item.participant.identity, pipIdentity)
                ? IOS_PIP_OPTIONS
                : undefined
            }
          />
        ) : (
          <View style={[styles.video, styles.placeholder]} />
        )}
        <View style={styles.tileFooter}>
          <Text style={styles.tileLabel} numberOfLines={1}>
            {label}
            {isLocal ? " (you)" : ""}
          </Text>
          <Text style={styles.micState}>{micOn ? "Mic on" : "Muted"}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meeting</Text>
          {showModeratorChrome ? (
            <Text style={styles.moderatorBadge}>Moderator (from token)</Text>
          ) : null}
        </View>
        <Pressable onPress={onLeave}>
          <Text style={styles.leave}>Leave</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showModeratorChrome ? (
        <View style={styles.moderatorBar}>
          <Text style={styles.moderatorHint}>
            Host/cohost tools use your existing join grant. Full moderation
            (mute all, spotlight) stays on the web app — no second token is
            minted here.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={data}
        key={columns}
        numColumns={columns}
        keyExtractor={(item, index) =>
          `${item.participant.identity}-${index}`
        }
        renderItem={renderTile}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
      />

      <View style={styles.toolbar}>
        <Pressable
          style={[
            styles.toolbarButton,
            !isMicrophoneEnabled && styles.toolbarButtonMuted,
          ]}
          onPress={() => void toggleMute()}
        >
          <Text style={styles.toolbarButtonText}>
            {isMicrophoneEnabled ? "Mute" : "Unmute"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1115" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  moderatorBadge: {
    color: "#9fd0ff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  leave: { color: "#ff8a8a", fontWeight: "600" },
  error: { color: "#ffb4b4", paddingHorizontal: 16, marginBottom: 8 },
  moderatorBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#1a2332",
  },
  moderatorHint: { color: "#b8c7da", fontSize: 12, lineHeight: 18 },
  grid: { paddingHorizontal: 12, paddingBottom: 12 },
  gridRow: { gap: 8, marginBottom: 8 },
  tile: { marginBottom: 8 },
  video: {
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: "#1c1f26",
  },
  placeholder: { borderWidth: 1, borderColor: "#2a3140" },
  tileFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  tileLabel: { color: "#e8edf5", fontSize: 12, flex: 1 },
  micState: { color: "#9aa7b8", fontSize: 11 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#232833",
    backgroundColor: "#12151b",
  },
  toolbarButton: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#2b3445",
    alignItems: "center",
  },
  toolbarButtonMuted: { backgroundColor: "#5a2b2b" },
  toolbarButtonText: { color: "#fff", fontWeight: "700" },
});
