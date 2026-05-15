/**
 * EditModeIndicator — small badge shown in CreateInterview header when
 * editing an existing interview. Surfaces the "Edit mode" pill plus
 * the last-saved timestamp.
 */
interface Props {
  lastSavedAt: Date | null;
}

export function EditModeIndicator({ lastSavedAt }: Props) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      {lastSavedAt && (
        <span className="text-success">
          Last saved: {lastSavedAt.toLocaleTimeString()}
        </span>
      )}
      <div className="flex items-center space-x-1 px-2 py-1 bg-info-soft text-info rounded-full">
        <div className="w-1.5 h-1.5 bg-info rounded-full" />
        <span className="text-xs font-medium">Edit mode</span>
      </div>
    </div>
  );
}
