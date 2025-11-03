"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Globe,
  User,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_VARIABLES, getPreview } from "@/lib/canned-response-variables";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  scope: "PERSONAL" | "COMPANY";
  usageCount: number;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CannedResponsesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    shortcut: "",
    category: "",
    scope: "PERSONAL" as "PERSONAL" | "COMPANY",
  });
  const [showPreview, setShowPreview] = useState(false);

  // Extract unique categories from responses
  const categories = Array.from(
    new Set(responses.map((r) => r.category).filter(Boolean))
  ) as string[];

  useEffect(() => {
    fetchResponses();
  }, [scopeFilter, categoryFilter, searchQuery]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (scopeFilter !== "all") params.append("scope", scopeFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/canned-responses?${params}`);
      const data = await res.json();

      if (res.ok) {
        setResponses(data.responses);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch canned responses",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching responses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch canned responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (response?: CannedResponse) => {
    if (response) {
      setEditingResponse(response);
      setFormData({
        title: response.title,
        content: response.content,
        shortcut: response.shortcut || "",
        category: response.category || "",
        scope: response.scope,
      });
    } else {
      setEditingResponse(null);
      setFormData({
        title: "",
        content: "",
        shortcut: "",
        category: "",
        scope: "PERSONAL",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingResponse(null);
    setShowPreview(false);
  };

  const handleSubmit = async () => {
    try {
      const url = editingResponse
        ? `/api/canned-responses/${editingResponse.id}`
        : "/api/canned-responses";

      const method = editingResponse ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: editingResponse
            ? "Canned response updated successfully"
            : "Canned response created successfully",
        });
        handleCloseDialog();
        fetchResponses();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save canned response",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving response:", error);
      toast({
        title: "Error",
        description: "Failed to save canned response",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this canned response?")) {
      return;
    }

    try {
      const res = await fetch(`/api/canned-responses/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Canned response deleted successfully",
        });
        fetchResponses();
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Failed to delete canned response",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting response:", error);
      toast({
        title: "Error",
        description: "Failed to delete canned response",
        variant: "destructive",
      });
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Response content copied to clipboard",
    });
  };

  const canEdit = (response: CannedResponse) => {
    if (response.scope === "PERSONAL") {
      return response.createdBy.id === session?.user?.id;
    }
    return session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Canned Responses</h1>
          <p className="text-gray-600 mt-1">
            Save time with pre-written responses for common questions
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Response
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by title, content, or shortcut..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Responses</SelectItem>
                  <SelectItem value="personal">Personal Only</SelectItem>
                  <SelectItem value="company">Company Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading canned responses...</p>
        </div>
      ) : responses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">No canned responses yet</p>
            <p className="text-gray-600 mb-4">
              Create your first canned response to save time on common replies
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Response
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {responses.map((response) => (
            <Card key={response.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{response.title}</CardTitle>
                    {response.shortcut && (
                      <Badge variant="outline" className="mt-2">
                        <Zap className="w-3 h-3 mr-1" />/{response.shortcut}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            {response.scope === "COMPANY" ? (
                              <Globe className="w-4 h-4 text-blue-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {response.scope === "COMPANY" ? "Company-wide" : "Personal"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {response.content}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Used {response.usageCount} times
                  </div>
                  {response.category && (
                    <Badge variant="secondary" className="text-xs">
                      {response.category}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopyContent(response.content)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  {canEdit(response) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(response)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(response.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResponse ? "Edit Canned Response" : "New Canned Response"}
            </DialogTitle>
            <DialogDescription>
              Create reusable responses with variables like {"{"}{"{"} name{"}"}{"}"}, {"{"}{"{"}email{"}"}{"}"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Shipping Policy"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="content">Response Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder={`Hi {{name}}, \n\nThank you for contacting us...`}
                rows={8}
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shortcut">Shortcut (optional)</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50 text-gray-600">
                    /
                  </span>
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) =>
                      setFormData({ ...formData, shortcut: e.target.value })
                    }
                    placeholder="shipping"
                    className="rounded-l-none"
                    maxLength={50}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Type /shipping in chat to use
                </p>
              </div>

              <div>
                <Label htmlFor="category">Category (optional)</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Sales, Support"
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="scope">Visibility</Label>
              <Select
                value={formData.scope}
                onValueChange={(value: "PERSONAL" | "COMPANY") =>
                  setFormData({ ...formData, scope: value })
                }
                disabled={
                  session?.user?.role !== "OWNER" &&
                  session?.user?.role !== "ADMIN"
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Personal (Only You)
                    </div>
                  </SelectItem>
                  <SelectItem value="COMPANY">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Company-wide (All Agents)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {session?.user?.role !== "OWNER" &&
                session?.user?.role !== "ADMIN" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Only owners and admins can create company-wide responses
                  </p>
                )}
            </div>

            {/* Available Variables */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-sm mb-2">Available Variables:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <div
                    key={variable.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        content: formData.content + ` {{${variable.key}}}`,
                      });
                    }}
                  >
                    <code className="bg-white px-2 py-1 rounded text-blue-600">
                      {"{{" + variable.key + "}}"}
                    </code>
                    <span className="text-gray-600">{variable.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {formData.content && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Preview</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? "Hide" : "Show"} Preview
                  </Button>
                </div>
                {showPreview && (
                  <div className="bg-blue-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {getPreview(formData.content)}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || !formData.content}
            >
              {editingResponse ? "Update" : "Create"} Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
