import assert from "node:assert/strict";
import {
  mergeConversationRefresh,
  type Conversation,
  type MessageEntry,
} from "@/lib/messages-shared";

function message(index: number): MessageEntry {
  return {
    id: String(index).padStart(3, "0"),
    from: "client",
    text: `Message ${index}`,
    time: "",
    createdAt: new Date(1_700_000_000_000 + index * 1_000).toISOString(),
  };
}

function conversation(from: number, to: number, totalCount: number): Conversation {
  const messages = Array.from({ length: to - from + 1 }, (_, offset) =>
    message(from + offset)
  );
  return {
    id: "thread",
    vendor: "Vendor",
    initials: "VE",
    preview: messages.at(-1)?.text ?? "",
    time: "",
    createdAt: messages.at(-1)?.createdAt ?? null,
    clientName: "Client",
    vendorName: "Vendor",
    counterpartyName: "Vendor",
    counterpartyRole: "vendor",
    hasMessages: messages.length > 0,
    unread: false,
    unreadCount: 0,
    lastReadAt: null,
    booking: {
      status: "INQUIRY",
      statusLabel: "Inquiry",
      eventDate: null,
      notes: null,
      service: null,
      weddingEvent: null,
      weddingDay: null,
    },
    messagePage: {
      hasOlder: from > 1,
      oldestCreatedAt: messages[0]?.createdAt ?? null,
      oldestId: messages[0]?.id ?? null,
      totalCount,
    },
    messages,
  };
}

const overlapping = mergeConversationRefresh(
  [conversation(1, 40, 40)],
  [conversation(21, 60, 60)]
)[0];
assert.equal(overlapping.messages.length, 60);
assert.equal(overlapping.messagePage.oldestId, "001");

const jumped = mergeConversationRefresh(
  [conversation(1, 40, 40)],
  [conversation(51, 90, 90)]
)[0];
assert.equal(jumped.messages.length, 40);
assert.equal(jumped.messagePage.oldestId, "051");
assert.equal(jumped.messagePage.hasOlder, true);

console.log("Message pagination: overlapping and jumped refresh windows passed.");
