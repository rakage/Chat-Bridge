"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Key,
  Save,
  AlertCircle,
  CheckCircle,
  Brain,
  Settings,
  Zap,
  Trash2,
  History,
  TrendingUp,
  Database,
  MessageSquare,
} from "lucide-react";
import { OpenAI, Gemini } from "@lobehub/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function LLMConfigPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [llmLoading, setLlmLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const hasMountedRef = useRef(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Usage logs state
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const [llmSettings, setLlmSettings] = useState({
    provider: "OPENAI",
    apiKey: "",
    model: "gpt-3.5-turbo",
    temperature: 0.3,
    maxTokens: 512,
    systemPrompt:
      "You are a helpful, brand-safe support assistant. Always be professional, helpful, and on-brand.",
  });

  const [currentConfig, setCurrentConfig] = useState<{
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    hasApiKey: boolean;
  } | null>(null);

  // Load usage logs
  const loadUsageLogs = useCallback(async () => {
    setUsageLoading(true);
    try {
      const typeParam = selectedFilter === "all" ? "" : `&type=${selectedFilter}`;
      const response = await fetch(`/api/usage-logs?limit=50${typeParam}`);
      if (response.ok) {
        const data = await response.json();
        setUsageLogs(data.logs);
        setUsageStats(data.statistics);
      }
    } catch (error) {
      console.error("Failed to load usage logs:", error);
    } finally {
      setUsageLoading(false);
    }
  }, [selectedFilter]);

  // Load cached data on component mount
  useEffect(() => {
    try {
      const cachedConfig = localStorage.getItem("llm-config");
      const cacheTimestamp = localStorage.getItem("llm-config-timestamp");

      // Check if cache is less than 5 minutes old
      const isCacheValid =
        cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000;

      if (cachedConfig && isCacheValid) {
        const parsedConfig = JSON.parse(cachedConfig);
        setCurrentConfig(parsedConfig);

        // Set form settings (without API key for security)
        setLlmSettings({
          provider: parsedConfig.provider || "OPENAI",
          apiKey: "", // Never load the actual API key for security
          model: parsedConfig.model || "gpt-3.5-turbo",
          temperature: parsedConfig.temperature || 0.3,
          maxTokens: parsedConfig.maxTokens || 512,
          systemPrompt: parsedConfig.systemPrompt || "",
        });

        setDataLoaded(true);
        return;
      }
    } catch (error) {
      console.error("Error loading cached LLM config:", error);
    }
  }, []);

  const loadLLMSettings = useCallback(async () => {
    if (dataLoaded) return; // Prevent multiple loads

    try {
      const response = await fetch("/api/settings/provider");
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          // Set current config for display
          setCurrentConfig(data.config);

          // Cache the config
          localStorage.setItem("llm-config", JSON.stringify(data.config));
          localStorage.setItem("llm-config-timestamp", Date.now().toString());

          // Set form settings (without API key for security)
          setLlmSettings({
            provider: data.config.provider || "OPENAI",
            apiKey: "", // Never load the actual API key for security
            model: data.config.model || "gpt-3.5-turbo",
            temperature: data.config.temperature || 0.3,
            maxTokens: data.config.maxTokens || 512,
            systemPrompt: data.config.systemPrompt || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load LLM settings:", error);
    } finally {
      setDataLoaded(true);
    }
  }, [dataLoaded]);

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

  // Load data only once when component first mounts and user is authenticated
  useEffect(() => {
    if (
      sessionStatus === "loading" ||
      !session?.user ||
      dataLoaded ||
      hasMountedRef.current
    ) {
      return;
    }

    hasMountedRef.current = true;
    loadLLMSettings();
    loadUsageLogs();
  }, [session, sessionStatus, dataLoaded, loadLLMSettings, loadUsageLogs]);

  // Reload usage logs when filter changes
  useEffect(() => {
    if (dataLoaded) {
      loadUsageLogs();
    }
  }, [selectedFilter, dataLoaded, loadUsageLogs]);

  const handleLLMSave = async () => {
    setLlmLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/settings/provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(llmSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save LLM settings");
        return;
      }

      const data = await response.json();
      setSuccess("LLM settings saved successfully!");

      // Update current config with the saved data
      if (data.config) {
        setCurrentConfig(data.config);

        // Update cache
        localStorage.setItem("llm-config", JSON.stringify(data.config));
        localStorage.setItem("llm-config-timestamp", Date.now().toString());
      }

      // Clear the API key field after successful save
      setLlmSettings((prev) => ({ ...prev, apiKey: "" }));
    } catch (error) {
      setError("Failed to save LLM settings");
      console.error("LLM save error:", error);
    } finally {
      setLlmLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!llmSettings.apiKey) {
      setError("Please enter an API key before testing");
      return;
    }

    setError("");
    setSuccess("");

    try {
      // Test the connection by attempting to save the config first
      const response = await fetch("/api/settings/provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(llmSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "LLM connection test failed");
        return;
      }

      const data = await response.json();
      setSuccess(
        "LLM connection successful! Configuration saved and validated."
      );

      // Update current config with the saved data
      if (data.config) {
        setCurrentConfig(data.config);

        // Update cache
        localStorage.setItem("llm-config", JSON.stringify(data.config));
        localStorage.setItem("llm-config-timestamp", Date.now().toString());
      }

      // Clear the API key field after successful save
      setLlmSettings((prev) => ({ ...prev, apiKey: "" }));
    } catch (error) {
      setError("Failed to test LLM connection");
      console.error("LLM test error:", error);
    }
  };

  const handleDeleteConfig = async () => {
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/settings/provider", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete LLM configuration");
        return;
      }

      const data = await response.json();
      setSuccess(data.message);

      // Reset state
      setCurrentConfig(null);
      setLlmSettings({
        provider: "OPENAI",
        apiKey: "",
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        maxTokens: 512,
        systemPrompt:
          "You are a helpful, brand-safe support assistant. Always be professional, helpful, and on-brand.",
      });

      // Clear cache
      localStorage.removeItem("llm-config");
      localStorage.removeItem("llm-config-timestamp");

      setDeleteDialogOpen(false);
    } catch (error) {
      setError("Failed to delete LLM configuration");
      console.error("LLM delete error:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Auto-dismiss messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "OPENAI":
        return <OpenAI size={24} />;
      case "GEMINI":
        return <Gemini.Color size={24} />;
      default:
        return <OpenAI size={24} />;
    }
  };

  const getModelOptions = (provider: string) => {
    switch (provider) {
      case "OPENAI":
        return ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"];
      case "GEMINI":
        return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
      default:
        return [];
    }
  };

  const getDefaultModel = (provider: string) => {
    switch (provider) {
      case "OPENAI":
        return "gpt-3.5-turbo";
      case "GEMINI":
        return "gemini-1.5-flash";
      default:
        return "";
    }
  };

  // Show loading state if not loaded and not using cache
  if (!dataLoaded && sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-5 w-96" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete LLM Configuration?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete your LLM configuration and <strong>automatically disable AI Auto-Response</strong> for all integrations (Facebook, Instagram, Telegram, and Chat Widget).
                </p>
                <p className="text-sm text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfig}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-1">
          Configure your AI language model provider and settings
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LLM Provider Configuration */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <span>AI Provider Settings</span>
              </CardTitle>
              <CardDescription>
                Configure your AI language model provider and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div>
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-3">
                    AI Provider
                  </legend>
                  <div
                    id="provider-selection"
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {["OPENAI", "GEMINI"].map((provider) => (
                      <label
                        key={provider}
                        className={`relative cursor-pointer rounded-lg border p-4 hover:bg-gray-50 ${
                          llmSettings.provider === provider
                            ? "border-purple-500 ring-2 ring-purple-500"
                            : "border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="provider"
                          value={provider}
                          checked={llmSettings.provider === provider}
                          onChange={() =>
                            setLlmSettings((prev) => ({
                              ...prev,
                              provider,
                              model: getDefaultModel(provider),
                            }))
                          }
                          className="sr-only"
                          aria-describedby={`${provider}-description`}
                        />

                        <span className="sr-only">
                          Select {provider === "OPENAI" && "OpenAI"}
                          {provider === "GEMINI" && "Google Gemini"} as AI
                          provider
                        </span>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center">
                            {getProviderIcon(provider)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {provider === "OPENAI" && "OpenAI"}
                              {provider === "GEMINI" && "Google Gemini"}
                            </h3>
                            <p
                              className="text-sm text-gray-500"
                              id={`${provider}-description`}
                            >
                              {provider === "OPENAI" && "GPT models"}
                              {provider === "GEMINI" && "Gemini Pro/Flash"}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type="password"
                    value={llmSettings.apiKey}
                    onChange={(e) =>
                      setLlmSettings((prev) => ({
                        ...prev,
                        apiKey: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${llmSettings.provider} API key`}
                    className="pl-10"
                  />
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely
                </p>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={llmSettings.model}
                  onValueChange={(value) =>
                    setLlmSettings((prev) => ({
                      ...prev,
                      model: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelOptions(llmSettings.provider).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={llmSettings.temperature}
                    onChange={(e) =>
                      setLlmSettings((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls randomness (0.0-2.0)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Max Tokens</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min="100"
                    max="4000"
                    value={llmSettings.maxTokens}
                    onChange={(e) =>
                      setLlmSettings((prev) => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum response length
                  </p>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  rows={4}
                  value={llmSettings.systemPrompt}
                  onChange={(e) =>
                    setLlmSettings((prev) => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  placeholder="Define the AI's personality and behavior..."
                />
                <p className="text-xs text-muted-foreground">
                  Instructions that define how the AI should behave and respond
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleLLMSave}
                  disabled={llmLoading || !llmSettings.apiKey}
                  className="flex-1"
                >
                  {llmLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={!llmSettings.apiKey}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Info & Tips */}
        <div className="space-y-6">
          {/* Current Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <span>Current Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentConfig ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Provider:</span>
                    <span className="text-sm font-medium flex items-center gap-2">
                      {getProviderIcon(currentConfig.provider)}
                      {currentConfig.provider}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Model:</span>
                    <span className="text-sm font-medium">
                      {currentConfig.model}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Temperature:</span>
                    <span className="text-sm font-medium">
                      {currentConfig.temperature}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Tokens:</span>
                    <span className="text-sm font-medium">
                      {currentConfig.maxTokens}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">API Key:</span>
                    <span className="text-sm font-medium flex items-center">
                      {currentConfig.hasApiKey ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-green-600">Configured</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-red-600">Not Set</span>
                        </>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    No configuration found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Configure your LLM provider to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips & Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span>Best Practices</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span className="text-gray-600">
                    Use lower temperature (0.0-0.3) for consistent, factual
                    responses
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span className="text-gray-600">
                    Set clear brand guidelines in your system prompt
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span className="text-gray-600">
                    Test different models to find the best fit for your use case
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span className="text-gray-600">
                    Monitor token usage to optimize costs
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Token Usage History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5 text-blue-600" />
                <span>Token Usage History</span>
              </CardTitle>
              <CardDescription>
                Track your token consumption for training and AI auto-responses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics Cards */}
          {usageStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Tokens</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">
                        {usageStats.overall.totalTokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {usageStats.overall.count} requests
                      </p>
                    </div>
                    <div className="rounded-full bg-blue-100 p-3">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Training</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">
                        {usageStats.training.totalTokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        {usageStats.training.count} sessions
                      </p>
                    </div>
                    <div className="rounded-full bg-purple-100 p-3">
                      <Database className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Auto-Response</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">
                        {usageStats.autoResponse.totalTokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {usageStats.autoResponse.count} responses
                      </p>
                    </div>
                    <div className="rounded-full bg-green-100 p-3">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Tabs */}
          <Tabs value={selectedFilter} onValueChange={setSelectedFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="TRAINING">Training</TabsTrigger>
              <TabsTrigger value="AUTO_RESPONSE">Auto-Response</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedFilter} className="mt-0">
              {usageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : usageLogs.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No usage logs yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Start training documents or enable auto-bot to track usage
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Input Tokens</TableHead>
                        <TableHead className="text-right">Output Tokens</TableHead>
                        <TableHead className="text-right">Total Tokens</TableHead>
                        <TableHead className="w-[180px]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.type === "TRAINING"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {log.type === "TRAINING" ? (
                                <>
                                  <Database className="h-3 w-3 mr-1" />
                                  Training
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Auto-Response
                                </>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {log.provider === "OPENAI" ? (
                                <OpenAI size={16} />
                              ) : (
                                <Gemini.Color size={16} />
                              )}
                              <span className="text-sm">{log.provider}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {log.model}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {log.inputTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {log.outputTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {log.totalTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

        {/* Delete Configuration Section */}
        {currentConfig && currentConfig.hasApiKey && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-900">
                <AlertCircle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription className="text-red-700">
                Delete your LLM configuration permanently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-red-900 mb-1">
                    Delete LLM Configuration
                  </h3>
                  <p className="text-sm text-red-700">
                    This will remove your API key and settings, and automatically disable all AI Auto-Response features.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="ml-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
