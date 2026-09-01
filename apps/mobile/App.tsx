import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LiveKitRoom, registerGlobals } from "@livekit/react-native";
import { StatusBar } from "expo-status-bar";
import { fetchMintedJoin, usableJoinToken } from "./src/join";
import { setupCallKeep } from "./src/callkeep";
import { MeetingGrid } from "./src/MeetingGrid";
import {
  configureMeetingAudioSession,
  stopMeetingAudioSession,
} from "./src/pip-session";
import { onPushRoomInvite } from "./src/push";

registerGlobals();

const DEFAULT_API = (() => {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.EXPO_PUBLIC_WEB_API_URL?.trim()
      : undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : "http://127.0.0.1:3000";
})();

type Session = { token: string; url: string };

export default function App() {
  const defaultIdentity = useMemo(
    () => `mobile-${Date.now().toString(36)}`,
    [],
  );
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API);
  const [roomName, setRoomName] = useState("sru-poc");
  const [identity, setIdentity] = useState(defaultIdentity);
  const [name, setName] = useState("");
  const [pasteToken, setPasteToken] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pushInviteRoomId, setPushInviteRoomId] = useState<string | null>(null);

  useEffect(() => {
    void setupCallKeep();
    onPushRoomInvite((invite) => {
      setPushInviteRoomId(invite.roomId);
      setRoomName(invite.roomId);
    });
    return () => {
      void stopMeetingAudioSession();
    };
  }, []);

  async function joinFromApi() {
    setError(null);
    setPending(true);
    const result = await fetchMintedJoin({
      apiBaseUrl,
      roomName,
      identity,
      name: name.trim() === "" ? undefined : name.trim(),
    });
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }
    try {
      await configureMeetingAudioSession();
    } catch {
      setPending(false);
      setError("Could not start the meeting audio session");
      return;
    }
    setPending(false);
    setSession({ token: result.token, url: result.url });
  }

  function joinFromPaste() {
    setError(null);
    const tokenCheck = usableJoinToken(pasteToken);
    if (!tokenCheck.ok) {
      setError(tokenCheck.message);
      return;
    }
    const url = pasteUrl.trim();
    if (!url) {
      setError("LiveKit URL is required");
      return;
    }
    void (async () => {
      setPending(true);
      try {
        await configureMeetingAudioSession();
        setSession({ token: pasteToken.trim(), url });
      } catch {
        setError("Could not start the meeting audio session");
      } finally {
        setPending(false);
      }
    })();
  }

  async function leaveMeeting() {
    await stopMeetingAudioSession();
    setSession(null);
  }

  if (session) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <LiveKitRoom
          serverUrl={session.url}
          token={session.token}
          connect
          audio
          video
          options={{ adaptiveStream: { pixelDensity: "screen" } }}
          onError={(err) => setError(err.message)}
          onDisconnected={() => void leaveMeeting()}
        >
          <MeetingGrid
            token={session.token}
            onLeave={() => void leaveMeeting()}
            error={error}
          />
        </LiveKitRoom>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.form}>
        <Text style={styles.title}>SRU Conf</Text>
        <Text style={styles.hint}>
          Mint a token from the local web API. LiveKit secrets stay on the
          server — never hardcode them here.
        </Text>

        {pushInviteRoomId ? (
          <Text style={styles.pushHint}>
            Push invite received for room {pushInviteRoomId}. Mint a token to
            join — pushes carry room id only, not LiveKit secrets.
          </Text>
        ) : null}

        <Text style={styles.label}>Web API base URL</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={apiBaseUrl}
          onChangeText={setApiBaseUrl}
          placeholder="http://127.0.0.1:3000"
        />

        <Text style={styles.label}>Room name</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={roomName}
          onChangeText={setRoomName}
        />

        <Text style={styles.label}>Identity</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={identity}
          onChangeText={setIdentity}
        />

        <Text style={styles.label}>Display name (optional)</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <Pressable
          style={[styles.button, pending && styles.buttonDisabled]}
          disabled={pending}
          onPress={() => void joinFromApi()}
        >
          {pending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Mint token and join</Text>
          )}
        </Pressable>

        <Text style={styles.divider}>or paste a minted token</Text>

        <Text style={styles.label}>Token</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          value={pasteToken}
          onChangeText={setPasteToken}
          placeholder="JWT from web /api/v1/dev/token or room tokens"
        />

        <Text style={styles.label}>LiveKit URL</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={pasteUrl}
          onChangeText={setPasteUrl}
          placeholder="ws://127.0.0.1:7880"
        />

        <Pressable style={styles.buttonSecondary} onPress={joinFromPaste}>
          <Text style={styles.buttonSecondaryText}>Join with pasted token</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f7f9" },
  form: { flex: 1, padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  hint: { color: "#445", marginBottom: 12, lineHeight: 20 },
  pushHint: {
    color: "#0b5fff",
    marginBottom: 12,
    lineHeight: 20,
    fontSize: 13,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#234" },
  input: {
    borderWidth: 1,
    borderColor: "#c9d0d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  button: {
    backgroundColor: "#0b5fff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700" },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#0b5fff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonSecondaryText: { color: "#0b5fff", fontWeight: "700" },
  divider: {
    textAlign: "center",
    color: "#667",
    marginVertical: 12,
    fontSize: 13,
  },
  error: { color: "#b00020", marginTop: 8 },
});
