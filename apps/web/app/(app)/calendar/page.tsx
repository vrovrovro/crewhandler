"use client";

import {
  clientContracts,
  clientListResponseSchema,
  createInterventionSchema,
  interventionContracts,
  interventionListResponseSchema,
  settingsContracts,
  settingsOverviewSchema,
} from "@acme/shared";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { createAuthedApi, apiContracts } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session-client";
import { StateCard } from "../../../components/feedback/state-card";
import { readViewCache, writeViewCache } from "../../../lib/view-cache";
import { InterventionForm } from "../../../components/forms/intervention-form";
import { AppSelect } from "../../../components/inputs/app-select";
import { Modal } from "../../../components/overlay/modal";
import { peekAuthState, resolveAuthState } from "../../../lib/auth-state";
import type { UserRole } from "@acme/shared";

type InterventionListResponse = z.infer<typeof interventionListResponseSchema>;
type ClientListResponse = z.infer<typeof clientListResponseSchema>;
type SettingsOverview = z.infer<typeof settingsOverviewSchema>;
type InterventionItem = InterventionListResponse["items"][number];
type CreateInterventionInput = z.infer<typeof createInterventionSchema>;

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const viewModes = ["Month", "Week", "Day"] as const;
const monthPreviewLimit = 2;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date: Date) => {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();
const formatDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const formatTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "No time";

export default function CalendarPage() {
  const [data, setData] = useState<InterventionListResponse | null>(() => readViewCache<InterventionListResponse>("calendar"));
  const [clients, setClients] = useState<ClientListResponse | null>(() => readViewCache<ClientListResponse>("calendar:clients"));
  const [members, setMembers] = useState<SettingsOverview["members"]>(() => readViewCache<SettingsOverview["members"]>("workspace:members") ?? []);
  const [role, setRole] = useState<UserRole | null>(() => peekAuthState()?.role ?? null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<(typeof viewModes)[number]>("Month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editIntervention, setEditIntervention] = useState<InterventionItem | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDateKey, setDropDateKey] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<"month" | "day">("month");

  const load = async () => {
    try {
      const api = createAuthedApi(getAccessToken);
      const authState = await resolveAuthState();
      setRole(authState.role);

      const result = await api.request(apiContracts.interventions, {
        query: { page: 1, pageSize: 100, sortBy: "scheduledAt", sortOrder: "asc" },
      });

      if (authState.role === "USER") {
        setData(result);
        setClients(null);
        setMembers([]);
        writeViewCache("calendar", result);
        setError(null);
        return;
      }

      const [clientResult, settingsOverview] = await Promise.all([
        api.request(clientContracts.list, {
          query: { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
        }),
        api.request(settingsContracts.overview, {}),
      ]);

      setData(result);
      setClients(clientResult);
      setMembers(settingsOverview.members);
      writeViewCache("calendar", result);
      writeViewCache("calendar:clients", clientResult);
      writeViewCache("workspace:members", settingsOverview.members);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load calendar");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }).map((_, index) => {
      const date = addDays(gridStart, index);
      const items = (data?.items ?? []).filter((item) => item.scheduledAt && sameDay(new Date(item.scheduledAt), date));
      return { date, items };
    });
  }, [currentDate, data]);

  const pickerGrid = useMemo(() => {
    const monthStart = startOfMonth(pickerDate);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }).map((_, index) => addDays(gridStart, index));
  }, [pickerDate]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      const items = (data?.items ?? []).filter((item) => item.scheduledAt && sameDay(new Date(item.scheduledAt), date));
      return { date, items };
    });
  }, [currentDate, data]);

  const dayItems = useMemo(
    () =>
      [...(data?.items ?? [])]
        .filter((item) => item.scheduledAt && sameDay(new Date(item.scheduledAt), currentDate))
        .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "")),
    [currentDate, data],
  );

  const saveScheduling = async (values: CreateInterventionInput) => {
    if (!editIntervention) return;
    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.update, {
      pathParams: { id: editIntervention.id },
      body: values,
    });
    await load();
    setEditIntervention(null);
  };

  const moveIntervention = async (interventionId: string, nextDate: Date) => {
    const intervention = data?.items.find((item) => item.id === interventionId);
    if (!intervention || !intervention.scheduledAt || role === "USER") return;

    const scheduled = new Date(intervention.scheduledAt);
    const moved = new Date(nextDate);
    moved.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);

    const api = createAuthedApi(getAccessToken);
    await api.request(interventionContracts.update, {
      pathParams: { id: intervention.id },
      body: {
        clientId: intervention.clientId,
        assignedTechnicianId: intervention.assignedTechnicianId ?? null,
        title: intervention.title,
        description: intervention.description ?? null,
        status: intervention.status,
        priority: intervention.priority,
        scheduledAt: moved.toISOString(),
        dueDate: intervention.dueDate ?? null,
        location: intervention.location ?? null,
        notes: intervention.notes ?? null,
      },
    });
    await load();
  };

  const handleDrop = async (date: Date) => {
    if (!draggingId) return;
    try {
      await moveIntervention(draggingId, date);
    } finally {
      setDraggingId(null);
      setDropDateKey(null);
    }
  };

  const changeRange = (direction: number) => {
    setCurrentDate((previous) => {
      if (viewMode === "Month") {
        const next = new Date(previous.getFullYear(), previous.getMonth() + direction, 1);
        setPickerDate(next);
        return next;
      }
      if (viewMode === "Week") {
        const next = addDays(previous, direction * 7);
        setPickerDate(next);
        return next;
      }
      const next = addDays(previous, direction);
      setPickerDate(next);
      return next;
    });
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setPickerDate(now);
  };

  const changeSelectedDay = (direction: number) => {
    setCurrentDate((previous) => addDays(previous, direction));
  };

  const rangeLabel =
    viewMode === "Month"
      ? currentDate.toLocaleDateString([], { month: "long", year: "numeric" })
      : viewMode === "Week"
        ? `${weekDays[0]?.date.toLocaleDateString([], { month: "short", day: "numeric" })} - ${weekDays[6]?.date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`
        : currentDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (error) {
    return <StateCard title="Unable to load calendar" description={error} />;
  }

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.08)] md:hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={jumpToToday}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Today
            </button>
            <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setMobileMode("day")}
                className={`flex-1 px-4 py-2 text-base font-semibold ${
                  mobileMode === "day" ? "bg-slate-950 text-white" : "text-slate-600"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setMobileMode("month")}
                className={`flex-1 border-l border-slate-200 px-4 py-2 text-base font-semibold ${
                  mobileMode === "month" ? "bg-slate-950 text-white" : "text-slate-600"
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {mobileMode === "month" ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <h2 className="text-[17px] font-semibold text-slate-950">
                {currentDate.toLocaleDateString([], { month: "long", year: "numeric" })}
              </h2>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => changeRange(-1)}
                  className="border-r border-slate-200 px-4 py-2 text-slate-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeRange(1)}
                  className="px-4 py-2 text-slate-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {dayLabels.map((day) => (
                <div key={day} className="py-2">
                  {day.slice(0, 1)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGrid.map(({ date, items }) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isSelected = sameDay(date, currentDate);
                const isToday = sameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => setCurrentDate(date)}
                    className={`relative aspect-square border-r border-b border-slate-200 px-1 pt-2 text-center text-[15px] font-semibold last:border-r-0 ${
                      isSelected
                        ? "bg-slate-950 text-white"
                        : isCurrentMonth
                          ? "bg-white text-slate-950"
                          : "bg-slate-50 text-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 ${
                        !isSelected && isToday ? "bg-slate-100 text-slate-950" : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {items.length ? (
                      <span
                        className={`absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                          isSelected ? "bg-white/80" : "bg-sky-500"
                        }`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {sameDay(currentDate, addDays(new Date(), -1))
                  ? "Yesterday"
                  : sameDay(currentDate, new Date())
                    ? "Today"
                    : currentDate.toLocaleDateString([], { weekday: "long" })}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {currentDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => changeSelectedDay(-1)}
                className="border-r border-slate-200 px-4 py-2 text-slate-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => changeSelectedDay(1)}
                className="px-4 py-2 text-slate-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div>
          {dayItems.length ? (
            dayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => (role !== "USER" ? setEditIntervention(item) : undefined)}
                className="grid w-full grid-cols-[96px_minmax(0,1fr)] border-t border-slate-200 text-left first:border-t-0"
              >
                <div className="flex min-h-[110px] flex-col items-center justify-center bg-slate-100 px-3 text-slate-950">
                  <span className="text-2xl font-semibold leading-none">
                    {item.scheduledAt
                      ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                      : "--:--"}
                  </span>
                  <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.priority}
                  </span>
                </div>
                <div className="flex min-h-[110px] items-center bg-white px-4">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.location ?? formatTime(item.scheduledAt)}</p>
                    <p className="mt-2 inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                      {item.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-sm text-slate-500">No scheduled interventions for this day.</div>
          )}
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:block">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Calendar</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => changeRange(-1)} className="p-2 text-slate-500 hover:text-slate-950">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((current) => !current)}
                  className="min-w-[190px] px-3 py-2 text-sm font-medium text-slate-700"
                >
                  {rangeLabel}
                </button>
                {pickerOpen ? (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[290px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPickerDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="text-sm font-semibold text-slate-900">
                        {pickerDate.toLocaleDateString([], { month: "long", year: "numeric" })}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPickerDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {dayLabels.map((day) => (
                        <div key={day}>{day.slice(0, 1)}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {pickerGrid.map((date) => {
                        const inMonth = date.getMonth() === pickerDate.getMonth();
                        const selected = sameDay(date, currentDate);
                        const today = sameDay(date, new Date());
                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            onClick={() => {
                              setCurrentDate(date);
                              setPickerDate(date);
                              setPickerOpen(false);
                            }}
                            className={`aspect-square rounded-lg text-sm transition ${
                              selected
                                ? "bg-slate-950 text-white"
                                : today
                                  ? "border border-slate-300 text-slate-950"
                                  : inMonth
                                    ? "text-slate-700 hover:bg-slate-100"
                                    : "text-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={() => changeRange(1)} className="p-2 text-slate-500 hover:text-slate-950">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={jumpToToday}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Today
            </button>
            <AppSelect
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value as (typeof viewModes)[number])}
              className="rounded-xl bg-white py-2.5"
            >
              {viewModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode} view
                </option>
              ))}
            </AppSelect>
          </div>
        </div>
      </div>

      {viewMode === "Month" ? (
        <div>
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {dayLabels.map((day) => (
              <div key={day} className="border-r border-slate-200 px-2 py-3 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid.map(({ date, items }) => {
              const currentMonth = date.getMonth() === currentDate.getMonth();
              const today = sameDay(date, new Date());
              const dateKey = formatDateKey(date);
              return (
                <div
                  key={date.toISOString()}
                  onDragOver={(event) => {
                    if (role === "USER") return;
                    event.preventDefault();
                    setDropDateKey(dateKey);
                  }}
                  onDragLeave={() => setDropDateKey((current) => (current === dateKey ? null : current))}
                  onDrop={() => void handleDrop(date)}
                  className={`min-h-[128px] border-r border-b border-slate-200 p-2 align-top last:border-r-0 ${
                    currentMonth ? "bg-white" : "bg-slate-50/60"
                  } ${dropDateKey === dateKey ? "bg-sky-50" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDate(date);
                      setViewMode("Day");
                    }}
                    className={`mb-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-medium ${
                      today ? "bg-slate-950 text-white" : currentMonth ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                  <div className="space-y-1.5">
                    {items.slice(0, monthPreviewLimit).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        draggable={role !== "USER"}
                        onDragStart={() => setDraggingId(item.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropDateKey(null);
                        }}
                        onClick={() => (role !== "USER" ? setEditIntervention(item) : undefined)}
                        className="flex w-full items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-left text-xs text-sky-900"
                      >
                        {role !== "USER" ? <GripVertical className="h-3 w-3 shrink-0 opacity-60" /> : null}
                        <span className="truncate">
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          {item.scheduledAt ? " " : ""}
                          {item.title}
                        </span>
                      </button>
                    ))}
                    {items.length > monthPreviewLimit ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDate(date);
                          setViewMode("Day");
                        }}
                        className="block px-2 text-left text-xs font-medium text-slate-500 hover:text-slate-950"
                      >
                        +{items.length - monthPreviewLimit} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "Week" ? (
        <div className="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-7">
          {weekDays.map(({ date, items }) => {
            const dateKey = formatDateKey(date);
            const today = sameDay(date, new Date());
            return (
              <div
                key={date.toISOString()}
                onDragOver={(event) => {
                  if (role === "USER") return;
                  event.preventDefault();
                  setDropDateKey(dateKey);
                }}
                onDragLeave={() => setDropDateKey((current) => (current === dateKey ? null : current))}
                onDrop={() => void handleDrop(date)}
                className={`min-h-[420px] bg-white p-3 ${dropDateKey === dateKey ? "bg-sky-50" : ""}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {date.toLocaleString([], { weekday: "short" })}
                    </p>
                    <p className={`mt-1 text-sm font-medium ${today ? "text-slate-950" : "text-slate-700"}`}>
                      {date.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {today ? <span className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white">Today</span> : null}
                </div>
                <div className="space-y-2">
                  {items.length ? (
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        draggable={role !== "USER"}
                        onDragStart={() => setDraggingId(item.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropDateKey(null);
                        }}
                        onClick={() => (role !== "USER" ? setEditIntervention(item) : undefined)}
                        className="flex w-full items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-left text-xs text-sky-900"
                      >
                        {role !== "USER" ? <GripVertical className="h-3 w-3 shrink-0 opacity-60" /> : null}
                        <span className="truncate">
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          {item.scheduledAt ? " " : ""}
                          {item.title}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No scheduled work</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {dayItems.length ? (
            dayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => (role !== "USER" ? setEditIntervention(item) : undefined)}
                className="flex w-full flex-col gap-2 px-4 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div>
                  <p className="font-medium text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.location ?? "No location"}</p>
                </div>
                <div className="text-sm text-slate-600">
                  {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Unscheduled"}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-sm text-slate-500 sm:px-6">No scheduled interventions.</div>
          )}
        </div>
      )}

      </section>
      {role !== "USER" ? (
        <Modal
          open={Boolean(editIntervention)}
          onClose={() => setEditIntervention(null)}
          title="Update calendar entry"
          description="Adjust intervention timing, assignment, and status directly from the calendar."
        >
          {clients && editIntervention ? (
            <InterventionForm
              clientOptions={clients.items.map((client) => ({
                id: client.id,
                name: client.name,
                address: client.address,
              }))}
              memberOptions={members.map((member) => ({
                id: member.userId,
                name: member.fullName,
                role: member.role,
              }))}
              initialValues={{
                clientId: editIntervention.clientId,
                assignedTechnicianId: editIntervention.assignedTechnicianId ?? null,
                title: editIntervention.title,
                description: editIntervention.description ?? "",
                status: editIntervention.status,
                priority: editIntervention.priority,
                scheduledAt: editIntervention.scheduledAt ?? null,
                dueDate: editIntervention.dueDate ?? null,
                location: editIntervention.location ?? "",
                notes: editIntervention.notes ?? "",
              }}
              submitLabel="Save calendar changes"
              onSubmitIntervention={saveScheduling}
            />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
