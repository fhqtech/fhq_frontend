import { useState } from 'react';
import { Plus, X, BookmarkPlus, Tag, Download, Edit3, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoAnnotation, formatTime } from '@/data/mockVideoData';

interface AnnotationsPanelProps {
  sessionId: string;
  annotations: VideoAnnotation[];
  currentTime: number; // milliseconds
  onSeekToAnnotation: (timestamp: number) => void;
}

type AnnotationTag = 'positive' | 'neutral' | 'negative' | 'follow-up' | 'excellent' | 'concern';

const tagColors: Record<AnnotationTag, string> = {
  positive: 'bg-green-100 text-green-800 border-green-200',
  excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  'follow-up': 'bg-blue-100 text-blue-800 border-blue-200',
  negative: 'bg-red-100 text-red-800 border-red-200',
  concern: 'bg-orange-100 text-orange-800 border-orange-200'
};

const tagLabels: Record<AnnotationTag, string> = {
  positive: 'Positive',
  excellent: 'Excellent',
  neutral: 'Neutral',
  'follow-up': 'Follow-up',
  negative: 'Negative',
  concern: 'Concern'
};

export function AnnotationsPanel({
  sessionId,
  annotations: initialAnnotations,
  currentTime,
  onSeekToAnnotation
}: AnnotationsPanelProps) {
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>(initialAnnotations);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedTag, setSelectedTag] = useState<AnnotationTag>('neutral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');

  // Add new annotation
  const handleAddAnnotation = () => {
    if (!newNote.trim()) return;

    const newAnnotation: VideoAnnotation = {
      id: `ann_${Date.now()}`,
      timestamp: currentTime,
      note: newNote.trim(),
      tag: selectedTag,
      createdAt: new Date()
    };

    setAnnotations(prev => [...prev, newAnnotation].sort((a, b) => a.timestamp - b.timestamp));
    setNewNote('');
    setSelectedTag('neutral');
    setIsAddingNote(false);

    // In real implementation, this would save to backend
    console.log('Adding annotation:', newAnnotation);
  };

  // Delete annotation
  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    // In real implementation, this would delete from backend
    console.log('Deleting annotation:', id);
  };

  // Start editing annotation
  const handleStartEdit = (annotation: VideoAnnotation) => {
    setEditingId(annotation.id);
    setEditNote(annotation.note);
  };

  // Save edited annotation
  const handleSaveEdit = () => {
    if (!editNote.trim() || !editingId) return;

    setAnnotations(prev =>
      prev.map(ann =>
        ann.id === editingId
          ? { ...ann, note: editNote.trim() }
          : ann
      )
    );

    setEditingId(null);
    setEditNote('');
    // In real implementation, this would update backend
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote('');
  };

  // Export annotations
  const handleExportAnnotations = () => {
    const exportData = {
      sessionId,
      annotations: annotations.map(ann => ({
        timestamp: formatTime(ann.timestamp),
        note: ann.note,
        tag: ann.tag,
        createdAt: ann.createdAt.toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Video Annotations</span>
            <Badge variant="secondary">{annotations.length}</Badge>
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNote(true)}
              disabled={isAddingNote}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAnnotations}
              disabled={annotations.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Add new annotation form */}
        {isAddingNote && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Clock className="h-4 w-4" />
                <span>Adding note at {formatTime(currentTime)}</span>
              </div>

              <Textarea
                placeholder="Enter your note or observation..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
                autoFocus
              />

              <div className="flex items-center justify-between">
                <Select value={selectedTag} onValueChange={(value: AnnotationTag) => setSelectedTag(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tagLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${tagColors[key as AnnotationTag]}`} />
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNote('');
                      setSelectedTag('neutral');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddAnnotation}
                    disabled={!newNote.trim()}
                  >
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {annotations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No annotations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Add Note" to start adding observations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSeekToAnnotation(annotation.timestamp)}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto font-mono text-sm"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(annotation.timestamp)}
                      </Button>
                      <Badge
                        variant="outline"
                        className={`text-xs ${tagColors[annotation.tag]}`}
                      >
                        {tagLabels[annotation.tag]}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {annotation.createdAt.toLocaleDateString()}
                      </span>
                    </div>

                    {/* Content */}
                    {editingId === annotation.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex items-center space-x-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {annotation.note}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== annotation.id && (
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(annotation)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAnnotation(annotation.id)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {annotations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
              {Object.entries(tagLabels).map(([tag, label]) => {
                const count = annotations.filter(ann => ann.tag === tag).length;
                return (
                  <div key={tag} className="text-center">
                    <div className={`text-xs px-2 py-1 rounded border ${tagColors[tag as AnnotationTag]}`}>
                      {label}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}