"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notification = {
  id: string;
  ticketId: string;
  ticketTitle: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  note: string | null;
  actorName: string;
  createdAt: string;
};

function formatAction(action: string) {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (value) => value.toUpperCase());
}

function timeAgo(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("maintainiq-read-notifications");
      if (saved) {
        setReadIds(JSON.parse(saved));
      }
    } catch {
      setReadIds([]);
    }

    fetch("/api/notifications")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load notifications");
        return response.json();
      })
      .then((data) => {
        setNotifications(data.notifications ?? []);
      })
      .catch(() => {
        setNotifications([]);
      });
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !readIds.includes(notification.id),
  ).length;

  function markAllRead() {
    const ids = notifications.map((notification) => notification.id);
    setReadIds(ids);

    try {
      localStorage.setItem(
        "maintainiq-read-notifications",
        JSON.stringify(ids),
      );
    } catch {
      // Ignore local storage failures.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[#35393c] bg-[#1d2022] text-sm text-[#b9bdb8] transition hover:border-[#4f78a8] hover:bg-[#202a35] hover:text-white"
      >
        <span>!</span>

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[#151718] bg-[#60a5fa] px-1 text-[8px] font-bold text-[#07111d]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-[100] w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-[#303438] bg-[#181b1d] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#303438] px-4 py-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                Updates
              </p>
              <h2 className="mt-0.5 text-sm font-bold text-[#ededE9]">
                Notifications
              </h2>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-semibold text-[#60a5fa] hover:text-[#93c5fd]"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-xs font-semibold text-[#b9bdb8]">
                  No notifications
                </p>
                <p className="mt-1 text-[10px] text-[#686d68]">
                  New ticket activity will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const unread = !readIds.includes(notification.id);

                return (
                  <Link
                    key={notification.id}
                    href={`/admin/tickets/${notification.ticketId}`}
                    onClick={() => {
                      const next = Array.from(
                        new Set([...readIds, notification.id]),
                      );

                      setReadIds(next);

                      try {
                        localStorage.setItem(
                          "maintainiq-read-notifications",
                          JSON.stringify(next),
                        );
                      } catch {
                        // Ignore local storage failures.
                      }
                    }}
                    className={`block border-b border-[#25282a] px-4 py-3 transition last:border-b-0 hover:bg-[#202427] ${
                      unread ? "bg-[#1b2633]" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          unread ? "bg-[#60a5fa]" : "bg-[#454b50]"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold text-[#dedfd9]">
                            {formatAction(notification.action)}
                          </p>

                          <span className="shrink-0 text-[9px] text-[#686d68]">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[11px] font-semibold text-[#aeb3ae]">
                          {notification.ticketTitle}
                        </p>

                        <p className="mt-0.5 text-[10px] text-[#737873]">
                          {notification.actorName}
                          {notification.newValue
                            ? ` ? ${notification.newValue}`
                            : ""}
                        </p>

                        {notification.note ? (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#686d68]">
                            {notification.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
