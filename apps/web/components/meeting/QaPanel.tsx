"use client";

import type { Question, QaPacket } from "@sru/shared";
import { QA_DATA_TOPIC, QaPacketSchema } from "@sru/shared";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";

function parseApiError(json: unknown, fallback: string): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: { message?: unknown } }).error?.message ===
      "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }
  return fallback;
}

function upsertQuestion(list: Question[], next: Question): Question[] {
  const index = list.findIndex((item) => item.id === next.id);
  if (next.status === "dismissed") {
    return list.filter((item) => item.id !== next.id);
  }
  if (index < 0) {
    return [...list, next];
  }
  return list.map((item) => (item.id === next.id ? next : item));
}

function sortQuestions(list: Question[]): Question[] {
  return list.slice().sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (a.upvoteCount !== b.upvoteCount) {
      return b.upvoteCount - a.upvoteCount;
    }
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

export function QaPanel({
  roomId,
  moderator,
}: {
  roomId: string;
  userId: string;
  moderator: boolean;
}) {
  const room = useRoomContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [body, setBody] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/rooms/${roomId}/questions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Question[] } | null) => {
        if (cancelled) return;
        setQuestions(sortQuestions(json?.data ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _p: unknown,
      _k: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== QA_DATA_TOPIC) {
        return;
      }
      try {
        const parsed = QaPacketSchema.safeParse(
          JSON.parse(new TextDecoder().decode(payload)),
        );
        if (!parsed.success) {
          return;
        }
        const packet = parsed.data as QaPacket;
        if (packet.type === "qa.submitted" || packet.type === "qa.updated") {
          setQuestions((current) =>
            sortQuestions(upsertQuestion(current, packet.question)),
          );
        }
      } catch {
        // ignore malformed packets
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  async function submitQuestion() {
    setError(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      setError(parseApiError(json, "Could not submit question"));
      return;
    }
    const created = json as Question;
    setQuestions((current) => sortQuestions(upsertQuestion(current, created)));
    setBody("");
  }

  async function patchQuestion(raw: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/questions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      setError(parseApiError(json, "Could not update question"));
      return;
    }
    const updated = json as Question;
    setQuestions((current) => sortQuestions(upsertQuestion(current, updated)));
  }

  return (
    <aside className="sru-meet-panel" aria-label="Q and A">
      <h2>Q&amp;A</h2>
      {error ? (
        <p role="alert" className="px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="space-y-2 px-3 py-2">
        <label className="block text-sm" htmlFor="qa-body">
          Ask a question
        </label>
        <textarea
          id="qa-body"
          className="sru-input min-h-20 w-full"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
        />
        <button
          type="button"
          className="sru-cta"
          disabled={!body.trim()}
          onClick={() => void submitQuestion()}
        >
          Submit
        </button>
      </div>
      <ul className="space-y-3 px-3 py-2">
        {questions.map((question) => (
          <li key={question.id} className="rounded border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {question.isPinned ? "📌 " : null}
                {question.body}
              </p>
              <span className="text-xs text-gray-500">
                {question.upvoteCount} upvote{question.upvoteCount === 1 ? "" : "s"}
              </span>
            </div>
            {question.answer ? (
              <p className="mt-2 text-sm text-gray-700">Answer: {question.answer}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="sru-meet-btn"
                disabled={question.hasUpvoted}
                onClick={() =>
                  void patchQuestion({ action: "upvote", questionId: question.id })
                }
              >
                {question.hasUpvoted ? "Upvoted" : "Upvote"}
              </button>
              {moderator ? (
                <>
                  <button
                    type="button"
                    className="sru-meet-btn"
                    onClick={() =>
                      void patchQuestion({
                        action: "pin",
                        questionId: question.id,
                        value: !question.isPinned,
                      })
                    }
                  >
                    {question.isPinned ? "Unpin" : "Pin"}
                  </button>
                  {question.status !== "answered" ? (
                    <>
                      <input
                        className="sru-input min-w-40 flex-1"
                        placeholder="Write an answer"
                        value={answerDrafts[question.id] ?? ""}
                        onChange={(event) =>
                          setAnswerDrafts((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="sru-meet-btn"
                        onClick={() =>
                          void patchQuestion({
                            action: "answer",
                            questionId: question.id,
                            answer: answerDrafts[question.id] ?? "",
                          })
                        }
                      >
                        Answer
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="sru-meet-btn"
                    onClick={() =>
                      void patchQuestion({
                        action: "dismiss",
                        questionId: question.id,
                      })
                    }
                  >
                    Dismiss
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {questions.length === 0 ? (
        <p className="px-3 py-2 text-sm text-gray-600">No questions yet.</p>
      ) : null}
    </aside>
  );
}
