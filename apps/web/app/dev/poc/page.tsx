import { PocRoom } from "./poc-room";

type PocSearch = {
  auto?: string;
  room?: string;
  identity?: string;
  name?: string;
};

export default async function DevPocPage({
  searchParams,
}: {
  searchParams: Promise<PocSearch>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200 px-8 py-6">
        <h1 className="text-2xl font-semibold">Dev media PoC</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-700">
          Open this page in two browsers. Use the same room name and a
          different identity in each. Allow camera and microphone. This path
          is for local Compose LiveKit only. On Windows Docker Desktop, ICE
          may fail with &quot;could not establish pc connection&quot; because
          UDP 50000–60000 could not be published (mux is 7882/udp).
        </p>
      </header>
      <PocRoom
        initialRoomName={params.room}
        initialIdentity={params.identity}
        initialName={params.name}
        autoJoin={params.auto === "1"}
      />
    </main>
  );
}
