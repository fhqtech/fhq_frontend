import { useState, useEffect } from "react";
import { User, Envelope as Mail, SpeakerHigh as Volume2, CheckCircle, Play, Stop, FolderOpen as Folder, MagnifyingGlass as Search, Star } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Project {
  id: string;
  name: string;
  ownerId?: string;
  admins?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  stats?: any;
}

export default function Settings() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [settings, setSettings] = useState({
    profile: {
      name: user?.name || "",
      email: user?.email || "",
      phone: "",
      company: ""
    },
    communications: {
      email: true,
      sms: false,
      phone: true,
      whatsapp: false
    },
    voice: {
      type: "professional-female",
      speed: "normal",
      accent: "neutral"
    },
    notifications: {
      interviewComplete: false,
      candidateShortlisted: false,
      lowScoreAlert: false,
      dailyDigest: false
    },
    appearance: {
      theme: "light",
      compactMode: false
    }
  });

  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  // Audio file mapping for preview
  const getAudioFile = (accent: string, speed: string) => {
    return `/${accent}_${speed}.wav`;
  };

  const playAudioPreview = () => {
    if (audioRef) {
      audioRef.pause();
      setIsPlayingAudio(false);
    }

    const audioFile = getAudioFile(settings.voice.accent, settings.voice.speed);
    const audio = new Audio(audioFile);

    setAudioRef(audio);
    setIsPlayingAudio(true);

    audio.onended = () => {
      setIsPlayingAudio(false);
      setAudioRef(null);
    };

    audio.onerror = () => {
      setIsPlayingAudio(false);
      setAudioRef(null);
      toast({
        title: "Error",
        description: "Could not play audio preview",
        variant: "destructive"
      });
    };

    audio.play().catch(() => {
      setIsPlayingAudio(false);
      setAudioRef(null);
      toast({
        title: "Error",
        description: "Could not play audio preview",
        variant: "destructive"
      });
    });
  };

  const stopAudioPreview = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setAudioRef(null);
    }
    setIsPlayingAudio(false);
  };

  // Stop audio when voice settings change
  useEffect(() => {
    if (isPlayingAudio) {
      stopAudioPreview();
    }
  }, [settings.voice.accent, settings.voice.speed]);

  // Cleanup when leaving the component/page
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        setAudioRef(null);
      }
    };
  }, [audioRef]);

  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.id) return;

      setIsLoadingWorkspaces(true);
      try {
        const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setWorkspaces(data || []);
          // Set current workspace as default
          if (data && data.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(currentWorkspace?.id || data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setWorkspaces([]);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [user?.id]);

  // Fetch projects when workspace changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedWorkspaceId || !user?.id) return;

      setIsLoadingProjects(true);
      try {
        const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces/${selectedWorkspaceId}/projects`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProjects(data || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [selectedWorkspaceId, user?.id]);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted mt-2">
            Configure your AI interviewer preferences and account settings.
          </p>
        </div>
        {/* S1.8: top-level Save was disabled with "Coming Soon" for the
            entire page lifetime. Each tab that has real save behavior
            should ship its own scoped Save button. Removed here to
            stop signaling "this product is half-built" on every page load. */}
      </div>

      {/* Control Center Button */}
      {currentWorkspace && (
        <div className="mb-6">
          <button
            onClick={() => {
              const controlTowerUrl = import.meta.env.VITE_CONTROL_TOWER_URL || 'http://localhost:8084';
              const token = localStorage.getItem('auth_token');
              // Pass token in URL - Control Tower will immediately store it and remove from URL
              window.open(`${controlTowerUrl}?workspace=${currentWorkspace.id}&token=${encodeURIComponent(token || '')}`, '_blank', 'noopener,noreferrer');
            }}
            className="px-6 py-3 bg-[hsl(var(--ink))] text-paper rounded-lg font-semibold hover:bg-[#1a1f26] transition-all duration-200 shadow-2 hover:shadow-2"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                <path d="M135.16,84.42a8,8,0,0,0-14.32,0l-72,144a8,8,0,0,0,14.31,7.16L77,208h102.1l13.79,27.58A8,8,0,0,0,200,240a8,8,0,0,0,7.15-11.58ZM128,105.89,155.06,160H100.94ZM85,192l8-16h70.1l8,16Zm74.54-98.26a32,32,0,1,0-63,0,8,8,0,1,1-15.74,2.85,48,48,0,1,1,94.46,0,8,8,0,0,1-7.86,6.58,8.74,8.74,0,0,1-1.43-.13A8,8,0,0,1,159.49,93.74ZM64.15,136.21a80,80,0,1,1,127.7,0,8,8,0,0,1-12.76-9.65,64,64,0,1,0-102.18,0,8,8,0,0,1-12.76,9.65Z"></path>
              </svg>
              Go to Control Center
            </span>
          </button>
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="voice">Voice & AI</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-ink" />
                Profile information
              </CardTitle>
              <CardDescription>
                Update your personal and company information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={settings.profile.name}
                    onChange={(e) => updateSetting('profile', 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={settings.profile.phone}
                    onChange={(e) => updateSetting('profile', 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company name</Label>
                  <Input
                    id="company"
                    value={settings.profile.company}
                    onChange={(e) => updateSetting('profile', 'company', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-ink" />
                Your projects
              </CardTitle>
              <CardDescription>
                View and manage projects you have access to across all workspaces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Workspace Selector */}
              <div className="space-y-2">
                <Label htmlFor="workspace-select">Select workspace</Label>
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger id="workspace-select" className="w-full">
                    <SelectValue placeholder={isLoadingWorkspaces ? "Loading workspaces..." : "Select a workspace"} />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        <div className="flex items-center gap-2">
                          <span>{workspace.name}</span>
                          {workspace.ownerId === user?.id && (
                            <span className="text-xs text-info">(Owner)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Projects Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm text-muted">Name</th>
                      <th className="text-left p-4 font-medium text-sm text-muted">Type</th>
                      <th className="text-left p-4 font-medium text-sm text-muted">ID</th>
                      <th className="text-right p-4 font-medium text-sm text-muted">Star</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoadingProjects ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted">
                          Loading projects...
                        </td>
                      </tr>
                    ) : projects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted">
                          No projects found
                        </td>
                      </tr>
                    ) : (
                      projects
                        .filter(project =>
                          project.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                          project.id.toLowerCase().includes(projectSearchQuery.toLowerCase())
                        )
                        .map((project) => (
                          <tr key={project.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{project.name}</span>
                                {project.ownerId === user?.id && (
                                  <span className="text-xs text-info bg-info-soft px-2 py-0.5 rounded-full">Owner</span>
                                )}
                                {project.admins?.includes(user?.id || '') && project.ownerId !== user?.id && (
                                  <span className="text-xs text-gold-ink bg-paper-3 px-2 py-0.5 rounded-full">Admin</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-muted">Project</td>
                            <td className="p-4 text-muted font-mono text-sm">{project.id}</td>
                            <td className="p-4 text-right">
                              <button
                                aria-label="Favorite project"
                                className="text-muted hover:text-warning transition-colors"
                              >
                                <Star size={20} />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-ink" />
                Communication channels
              </CardTitle>
              <CardDescription>
                Configure how candidates can be reached for interviews
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-ink" />
                  <div>
                    <p className="font-medium text-foreground">Email notifications</p>
                    <p className="text-sm text-muted">Send interview invites via email</p>
                  </div>
                </div>
                <Switch
                  checked={settings.communications.email}
                  onCheckedChange={(checked) => updateSetting('communications', 'email', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-ink" />
                Voice calibration
              </CardTitle>
              <CardDescription>
                Customize the AI interviewer's voice characteristics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Voice Type - Single Line */}
              <div>
                <Label className="text-base font-medium">Voice type</Label>
                <div className="flex gap-3 mt-4">
                  {[
                    {
                      value: "professional-male",
                      label: "Grace · American English",
                      icon: "🎙️",
                      disabled: true
                    },
                    {
                      value: "professional-female",
                      label: "Smriti · Indian English",
                      icon: "🎙️",
                      disabled: false
                    }
                  ].map((voice) => {
                    const isSelected = settings.voice.type === voice.value;
                    const isDisabled = voice.disabled;
                    return (
                      <div
                        key={voice.value}
                        className={`relative flex-1 p-3 rounded-lg border transition-all duration-200 ${
                          isDisabled
                            ? 'border-rule bg-paper-3 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-ink bg-ink/15 shadow-2 cursor-pointer'
                              : 'border-rule bg-paper hover:border-ink/40 hover:shadow-1 hover:bg-paper-2/50 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && updateSetting('voice', 'type', voice.value)}
                      >
                        {isSelected && !isDisabled && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-ink rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-paper" weight="fill" />
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <div className={`text-lg ${isDisabled ? 'opacity-30' : 'opacity-60'}`}>{voice.icon}</div>
                          <div className={`font-medium text-sm ${isDisabled ? 'text-muted-2' : 'text-ink'}`}>{voice.label}</div>
                        </div>

                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-muted bg-paper px-2 py-1 rounded">Coming soon</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Speaking Speed and Accent - Single Line */}
              <div className="grid grid-cols-2 gap-8">
                {/* Speaking Speed */}
                <div>
                  <Label className="text-base font-medium">Speaking speed</Label>
                  <div className="mt-4 max-w-sm">
                    <div className="relative flex items-start justify-between">
                      {/* Connecting Line - positioned at radio button level */}
                      <div className="absolute top-2 left-2 right-2 h-0.5 bg-paper-4 z-0"></div>

                      {[
                        { value: "slow", label: "0.75x", display: "Slow" },
                        { value: "normal", label: "1x", display: "Normal" },
                        { value: "fast", label: "1.25x", display: "Fast" }
                      ].map((speed, index) => {
                        const isSelected = settings.voice.speed === speed.value;
                        return (
                          <div key={speed.value} className="relative z-10 flex flex-col items-center">
                            <label className="cursor-pointer flex flex-col items-center">
                              <input
                                type="radio"
                                name="voiceSpeed"
                                value={speed.value}
                                checked={isSelected}
                                onChange={(e) => updateSetting('voice', 'speed', e.target.value)}
                                className="w-4 h-4 rounded-full bg-paper border-2 border-rule-strong checked:border-ink checked:bg-ink focus:outline-hidden focus:ring-0 focus:ring-offset-0 appearance-none relative checked:after:content-[''] checked:after:w-2 checked:after:h-2 checked:after:rounded-full checked:after:bg-paper checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:transform checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                              />
                              <span className="text-xs font-semibold text-ink mt-2">{speed.label}</span>
                              <span className="text-xs text-muted mt-1">{speed.display}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Accent Selection */}
                <div>
                  <Label className="text-base font-medium">Accent</Label>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "indian", label: "Indian" },
                        { value: "american", label: "American" }
                      ].map((accent) => {
                        const isSelected = settings.voice.accent === accent.value;
                        return (
                          <Button
                            key={accent.value}
                            type="button"
                            variant={isSelected ? "default" : "outline-solid"}
                            size="sm"
                            className={`${
                              isSelected
                                ? 'bg-ink hover:bg-ink/90 text-paper border-ink'
                                : 'hover:bg-paper-2 border-rule'
                            }`}
                            onClick={() => updateSetting('voice', 'accent', accent.value)}
                          >
                            {accent.label}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Audio Preview */}
                    {settings.voice.accent && settings.voice.speed && (
                      <div className="flex items-center gap-6">
                        {/* Visual Synthesizer */}
                        {isPlayingAudio && (
                          <div className="flex items-center gap-2 h-6">
                            {[...Array(12)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-ink rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 20 + 6}px`,
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Control Button */}
                        {!isPlayingAudio ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={playAudioPreview}
                            className="flex items-center gap-1 px-3 py-1 text-xs border-ink text-ink hover:bg-ink hover:text-paper"
                          >
                            <Play className="w-3 h-3" weight="fill" />
                            Preview
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={stopAudioPreview}
                            className="flex items-center gap-1 px-3 py-1 text-xs border-danger/30 text-danger hover:bg-red-500 hover:text-paper"
                          >
                            <Stop className="w-3 h-3" weight="fill" />
                            Stop
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}