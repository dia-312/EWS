"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { effectiveOrder } from "@/lib/reorder";

export type SortableItem = {
  id: string;
  /** Used in the handle's accessible name ("Drag to reorder: Hero banner"). */
  label: string;
  node: ReactNode;
};

type ReorderResult = { error?: string } | void;

type CommonProps = {
  items: SortableItem[];
  /** Saves the new order of ids on the server. */
  onReorder: (ids: string[]) => Promise<ReorderResult>;
};

function useReorder({ items, onReorder }: CommonProps) {
  const t = useTranslations("admin.sortable");
  const savedIds = items.map((item) => item.id);
  const [dragged, setDragged] = useState<{ base: string; order: string[] } | null>(null);
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");

  const order = effectiveOrder(savedIds, dragged);
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order.map((id) => byId.get(id)!);
  const labelOf = (id: unknown) => byId.get(String(id))?.label ?? "";

  const sensors = useSensors(
    // A small distance, so a plain click on the handle is not a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    const next = arrayMove(order, from, to);
    setError(undefined);
    setDragged({ base: savedIds.join(","), order: next });
    setAnnouncement(t("moved", { name: labelOf(active.id), position: to + 1, total: next.length }));

    const result = await onReorder(next);
    if (result && result.error) {
      setDragged(null);
      setError(t("failed"));
    }
  }

  const accessibility = {
    screenReaderInstructions: { draggable: t("instructions") },
    announcements: {
      onDragStart: ({ active }: { active: { id: string | number } }) => t("picked", { name: labelOf(active.id) }),
      onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
        over ? t("over", { name: labelOf(active.id), position: order.indexOf(String(over.id)) + 1, total: order.length }) : undefined,
      onDragEnd: ({ active }: { active: { id: string | number } }) => t("dropped", { name: labelOf(active.id) }),
      onDragCancel: ({ active }: { active: { id: string | number } }) => t("cancelled", { name: labelOf(active.id) }),
    },
  };

  return { ordered, order, sensors, onDragEnd, accessibility, error, announcement, t };
}

/** The grip button that starts a drag with the mouse, a finger or the keyboard. */
function Handle({
  label,
  attributes,
  listeners,
}: {
  label: string;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  const t = useTranslations("admin.sortable");
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`${t("handle")}: ${label}`}
      title={t("handle")}
      data-drag-handle
      className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-border bg-background text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
    >
      <span aria-hidden className="text-lg leading-none">⠿</span>
    </button>
  );
}

function SortableListItem({ item, className, grid }: { item: SortableItem; className?: string; grid?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, grid ? "flex flex-col gap-2" : "flex items-start gap-3", isDragging && "relative z-10 opacity-80 shadow-lg")}
      data-sortable-id={item.id}
    >
      <Handle label={item.label} attributes={attributes} listeners={listeners} />
      <div className="min-w-0 flex-1">{item.node}</div>
    </li>
  );
}

/** A list the owner can reorder by dragging (or with the keyboard: Space, arrow keys, Space). */
export function SortableList({
  items,
  onReorder,
  as: Tag = "ol",
  className,
  itemClassName,
  grid = false,
  disabled = false,
}: CommonProps & { as?: "ol" | "ul"; className?: string; itemClassName?: string; grid?: boolean; disabled?: boolean }) {
  const { ordered, order, sensors, onDragEnd, accessibility, error, announcement } = useReorder({ items, onReorder });
  const contextId = useId();

  // Read-only accounts see the same list without the handles.
  if (disabled) {
    return (
      <Tag className={className}>
        {items.map((item) => (
          <li key={item.id} className={itemClassName}>
            {item.node}
          </li>
        ))}
      </Tag>
    );
  }

  return (
    <>
      <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={accessibility}>
        <SortableContext items={order} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
          <Tag className={className}>
            {ordered.map((item) => (
              <SortableListItem key={item.id} item={item} className={itemClassName} grid={grid} />
            ))}
          </Tag>
        </SortableContext>
      </DndContext>
      <p role="status" className="sr-only" data-reorder-status>
        {announcement}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

export type SortableRowItem = { id: string; label: string; cells: ReactNode };

function SortableTableRow({ item, className }: { item: SortableRowItem; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && "relative z-10 bg-background opacity-80 shadow-lg")}
      data-sortable-id={item.id}
    >
      <td className="w-12 px-4 py-3">
        <Handle label={item.label} attributes={attributes} listeners={listeners} />
      </td>
      {item.cells}
    </tr>
  );
}

/** The body of a table whose rows can be reordered by dragging. The first cell of each row is the handle. */
export function SortableTableBody({
  items,
  onReorder,
  rowClassName,
  disabled = false,
}: {
  items: SortableRowItem[];
  onReorder: CommonProps["onReorder"];
  rowClassName?: string;
  disabled?: boolean;
}) {
  const asItems = items.map((item) => ({ id: item.id, label: item.label, node: null }));
  const { order, sensors, onDragEnd, accessibility, error, announcement } = useReorder({ items: asItems, onReorder });
  const byId = new Map(items.map((item) => [item.id, item]));
  const contextId = useId();

  if (disabled) {
    return (
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className={rowClassName}>
            <td className="w-12 px-4 py-3" />
            {item.cells}
          </tr>
        ))}
      </tbody>
    );
  }

  return (
    <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={accessibility}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <tbody>
          {order.map((id) => (
            <SortableTableRow key={id} item={byId.get(id)!} className={rowClassName} />
          ))}
          <tr className="sr-only">
            <td colSpan={99}>
              <span role="status" data-reorder-status>
                {announcement}
              </span>
              {error && <span role="alert">{error}</span>}
            </td>
          </tr>
        </tbody>
      </SortableContext>
    </DndContext>
  );
}
