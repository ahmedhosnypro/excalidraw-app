"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import type { FileSummary } from "@/lib/types";
import { useReorderFiles } from "@/hooks/use-files";
import { FileListItem } from "@/components/editor/file-list-item";

interface FileListProps {
  files: FileSummary[];
}

/** Sortable list of drawings with drag-to-reorder (persists the new order). */
export function FileList({ files }: FileListProps) {
  const reorderFiles = useReorderFiles();
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const orderedFiles = localOrder
    ? localOrder
        .map((id) => files.find((f) => f.id === id))
        .filter((f): f is FileSummary => Boolean(f))
    : files;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = orderedFiles.findIndex((f) => f.id === active.id);
    const newIndex = orderedFiles.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    const next = [...orderedFiles];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    const nextIds = next.map((f) => f.id);
    setLocalOrder(nextIds);
    void reorderFiles.mutateAsync(nextIds).catch(() => {
      setLocalOrder(null);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedFiles.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto p-2">
          {orderedFiles.map((file) => (
            <SortableFileItem key={file.id} file={file} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableFileItem({ file }: { file: FileSummary }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex items-center gap-1"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="flex-1">
        <FileListItem
          fileId={file.id}
          name={file.name}
          shareToken={file.shareToken}
          folderId={file.folderId}
          starred={file.starred}
          updatedAt={file.updatedAt}
        />
      </div>
    </div>
  );
}
