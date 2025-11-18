"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  Upload,
  File,
  FileText,
  Play,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Settings,
} from "lucide-react";

interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: "UPLOADED" | "PROCESSING" | "PROCESSED" | "ERROR";
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TrainingSession {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  documentCount: number;
  documents: Array<{
    id: string;
    originalName: string;
    fileType: string;
  }>;
  startedBy: {
    id: string;
    name: string;
    email: string;
  };
  metadata: any;
  createdAt: string;
}

export default function TrainingPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // State management with persistence
  const [documents, setDocuments] = useState<Document[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(
    []
  );
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [llmConfig, setLlmConfig] = useState<{
    provider: string;
    model: string;
    hasApiKey: boolean;
  } | null>(null);
  const [llmConfigLoading, setLlmConfigLoading] = useState(true);

  // Load cached data on component mount
  useEffect(() => {
    try {
      const cachedDocuments = localStorage.getItem("training-documents");
      const cachedSessions = localStorage.getItem("training-sessions");
      const cacheTimestamp = localStorage.getItem("training-cache-timestamp");

      // Check if cache is less than 5 minutes old
      const isCacheValid =
        cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000;

      if (cachedDocuments && isCacheValid) {
        const parsedDocuments = JSON.parse(cachedDocuments);
        setDocuments(parsedDocuments);
        setDataLoaded(true);
      }

      if (cachedSessions && isCacheValid) {
        const parsedSessions = JSON.parse(cachedSessions);
        setTrainingSessions(parsedSessions);
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  }, []);

  // No user-configurable training settings needed - handled in backend

  // Permission check - only run when session is actually loaded
  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (
      session?.user?.role &&
      !["OWNER", "ADMIN"].includes(session.user.role)
    ) {
      router.push("/dashboard");
    }
  }, [session, sessionStatus, router]);

  // Load LLM config
  const loadLlmConfig = useCallback(async () => {
    try {
      setLlmConfigLoading(true);
      const response = await fetch("/api/settings/provider");
      if (response.ok) {
        const data = await response.json();
        setLlmConfig(data.config);
      }
    } catch (error) {
      console.error("Error loading LLM config:", error);
    } finally {
      setLlmConfigLoading(false);
    }
  }, []);

  // Load data - only once when component mounts and user is authenticated
  const loadData = useCallback(
    async (force = false) => {
      // Don't reload if data is already loaded unless forced
      if (dataLoaded && !force) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [documentsRes, sessionsRes] = await Promise.all([
          fetch("/api/training/upload"),
          fetch("/api/training/train"),
        ]);

        if (documentsRes.ok) {
          const documentsData = await documentsRes.json();
          const documents = documentsData.documents || [];
          setDocuments(documents);
          // Cache documents
          localStorage.setItem("training-documents", JSON.stringify(documents));
        }

        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          const sessions = sessionsData.trainingSessions || [];
          setTrainingSessions(sessions);
          // Cache sessions
          localStorage.setItem("training-sessions", JSON.stringify(sessions));
        }

        // Update cache timestamp
        localStorage.setItem("training-cache-timestamp", Date.now().toString());

        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [dataLoaded]
  );

  // Only load data once when session is ready and user is authenticated
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") return;
    if (!session?.user) return;

    loadLlmConfig();
    loadData();
  }, [sessionStatus, session?.user, loadLlmConfig, loadData]);

  // Poll for processing documents
  useEffect(() => {
    if (!dataLoaded || documents.length === 0) return;

    const processingDocs = documents.filter(
      (doc) => doc.status === "PROCESSING"
    );
    if (processingDocs.length === 0) return;

    console.log(`Polling for ${processingDocs.length} processing documents...`);

    const pollInterval = setInterval(() => {
      loadData(true);
    }, 2000); // Poll every 2 seconds

    // Stop polling when no more processing documents or after 1 minute
    const checkTimeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(checkTimeout);
    };
  }, [documents, dataLoaded, loadData]);

  // Handle page visibility changes to prevent unnecessary reloads
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Don't do anything special when tab becomes visible/hidden
      // This prevents the page from reloading when switching tabs
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Auto-dismiss success/error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // File upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadLoading(true);
    setError("");
    setSuccess("");

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/training/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }
      }

      setSuccess(`Successfully uploaded ${files.length} file(s)`);
      loadData(true); // Force reload after upload

      // Clear file input
      event.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`/api/training/upload?id=${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      setSuccess("Document deleted successfully");
      loadData(true); // Force reload after delete
    } catch (error) {
      console.error("Delete error:", error);
      setError(error instanceof Error ? error.message : "Delete failed");
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/rag/clear-cache", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clear cache");
      }

      const data = await response.json();
      setSuccess(`Successfully cleared ${data.clearedCount} cached response(s)`);
      console.log(`✅ Cache cleared: ${data.clearedCount} items`);
    } catch (error) {
      console.error("Clear cache error:", error);
      setError(error instanceof Error ? error.message : "Failed to clear cache");
    }
  };

  // Start training
  const handleStartTraining = async () => {
    if (selectedDocuments.length === 0) {
      setError("Please select at least one document");
      return;
    }

    setTrainingLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/training/train", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentIds: selectedDocuments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Training failed");
      }

      setSuccess("Training started successfully! Cache will be cleared automatically.");
      setSelectedDocuments([]);
      loadData(true); // Force reload after training start

      // Poll for updates
      const pollInterval = setInterval(() => {
        loadData(true); // Force reload during polling
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (error) {
      console.error("Training error:", error);
      setError(error instanceof Error ? error.message : "Training failed");
    } finally {
      setTrainingLoading(false);
    }
  };

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <File className="h-4 w-4 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "txt":
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UPLOADED":
        return <Badge variant="secondary">Uploaded</Badge>;
      case "PROCESSING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
        );
      case "PROCESSED":
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case "ERROR":
        return <Badge variant="destructive">Error</Badge>;
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  // Show skeleton on initial load or when no cache
  if ((loading && !dataLoaded) || (sessionStatus === "loading" && !dataLoaded)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-96" />
          <Skeleton className="h-4 w-32" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div>
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {loading && dataLoaded && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Refreshing...</span>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-700">{success}</p>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* LLM Config Warning */}
      {!llmConfigLoading && !llmConfig?.hasApiKey && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  LLM Configuration Required
                </h3>
                <p className="text-sm text-yellow-800 mb-4">
                  Before you can train documents, you need to set up your AI language model provider in the LLM Config page.
                  The system will use your configured provider's embeddings for training:
                </p>
                <ul className="text-sm text-yellow-800 mb-4 list-disc list-inside space-y-1">
                  <li>If using <strong>OpenAI</strong>, embeddings will be generated using OpenAI's embedding model</li>
                  <li>If using <strong>Google Gemini</strong>, embeddings will be generated using Google's embedding model</li>
                </ul>
                <Button
                  onClick={() => router.push("/dashboard/llm-config")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Go to LLM Config
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Info */}
      {!llmConfigLoading && llmConfig?.hasApiKey && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  AI Provider Configured
                </h3>
                <p className="text-sm text-blue-800">
                  Training will use <strong>{llmConfig.provider}</strong> ({llmConfig.model}) embeddings for your documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Upload */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <span>Upload Documents</span>
              </CardTitle>
              <CardDescription>
                Upload PDF, DOC, DOCX, or TXT files to train your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Choose files to upload
                  </p>
                  <p className="text-gray-600">
                    Supports PDF, DOC, DOCX, and TXT files up to 50MB each
                  </p>
                  <div className="mt-4">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploadLoading || !llmConfig?.hasApiKey}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        uploadLoading || !llmConfig?.hasApiKey
                          ? "bg-gray-400 cursor-not-allowed opacity-50"
                          : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      }`}
                    >
                      {uploadLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : !llmConfig?.hasApiKey ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Configure LLM First
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select Files
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Select documents to include in training
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments([
                              ...selectedDocuments,
                              doc.id,
                            ]);
                          } else {
                            setSelectedDocuments(
                              selectedDocuments.filter((id) => id !== doc.id)
                            );
                          }
                        }}
                        disabled={doc.status !== "PROCESSED"}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        {getFileIcon(doc.fileType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.fileSize)} •{" "}
                            {doc.fileType.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(doc.status)}
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Training Panel */}
        <div className="space-y-6">
          {/* Train Agent */}
          <Card>
            <CardHeader>
              <CardTitle>Train Agent</CardTitle>
              <CardDescription>
                Process selected documents to enhance AI responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">
                      How Training Works
                    </h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    Training will process your documents into searchable chunks,
                    generate embeddings, and enable the AI to provide
                    contextually accurate responses based on your content.
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span>Selected Documents:</span>
                  <span className="font-medium">
                    {selectedDocuments.length}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span>Ready for Training:</span>
                  <span className="font-medium">
                    {documents.filter((d) => d.status === "PROCESSED").length}
                  </span>
                </div>

                <Button
                  onClick={handleStartTraining}
                  disabled={
                    !llmConfig?.hasApiKey ||
                    selectedDocuments.length === 0 ||
                    trainingLoading ||
                    trainingSessions.some((s) =>
                      ["PENDING", "PROCESSING"].includes(s.status)
                    )
                  }
                  className="w-full"
                  size="lg"
                >
                  {trainingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Documents...
                    </>
                  ) : !llmConfig?.hasApiKey ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      LLM Config Required
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Training
                    </>
                  )}
                </Button>

                {/* Clear Cache Button */}
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Response Cache
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Clear cached responses to force bot to use newly trained documents
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Training Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Training Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {trainingSessions.length === 0 ? (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">
                    No training sessions yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingSessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(session.status)}
                          <span className="text-sm text-gray-600">
                            {session.documentCount} doc(s)
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {session.status === "PROCESSING" && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${session.progress}%` }}
                          />
                        </div>
                      )}

                      {session.errorMessage && (
                        <p className="text-xs text-red-600">
                          {session.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
