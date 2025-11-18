'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X, FileText, Palette, Code2 } from 'lucide-react';

export default function ChatWidgetPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [companyId, setCompanyId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [hasLLMConfig, setHasLLMConfig] = useState(false);

  useEffect(() => {
    loadConfig();
    checkLLMConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/widget/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setCompanyId(data.companyId);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load widget configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLLMConfig = async () => {
    try {
      const response = await fetch('/api/settings/provider');
      if (response.ok) {
        const data = await response.json();
        setHasLLMConfig(data.config?.hasApiKey || false);
      }
    } catch (error) {
      console.error('Error checking LLM config:', error);
      setHasLLMConfig(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/widget/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Widget configuration saved successfully',
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save widget configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const addAllowedDomain = () => {
    const currentDomains = config?.allowedDomains || [];
    setConfig({ 
      ...config, 
      allowedDomains: [...currentDomains, ''] 
    });
  };

  const updateAllowedDomain = (index: number, value: string) => {
    const currentDomains = [...(config?.allowedDomains || [])];
    currentDomains[index] = value;
    setConfig({ ...config, allowedDomains: currentDomains });
  };

  const removeAllowedDomain = (index: number) => {
    const currentDomains = [...(config?.allowedDomains || [])];
    currentDomains.splice(index, 1);
    setConfig({ ...config, allowedDomains: currentDomains });
  };

  const getEmbedCode = () => {
    const baseUrl = window.location.origin;
    return `<!-- Chat Widget -->
<script src="${baseUrl}/widget.js"></script>
<script>
  window.chatWidgetConfig = {
    companyId: '${companyId}'
  };
  new ChatWidget(window.chatWidgetConfig);
</script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    toast({
      title: 'Copied!',
      description: 'Embed code copied to clipboard',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard/integrations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat Widget</h1>
            <Skeleton className="h-5 w-96 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-11" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-36 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <Skeleton className="h-6 w-28 mb-4" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-11" />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-96 w-full rounded-lg" />
            </Card>

            <Card className="p-6">
              <Skeleton className="h-6 w-28 mb-4" />
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-10 w-32" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/integrations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat Widget</h1>
            <p className="text-gray-600 mt-1">
              Customize your embeddable chat widget and generate the embed code
            </p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="style" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Style
              </TabsTrigger>
              <TabsTrigger value="embed" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Embed
              </TabsTrigger>
            </TabsList>

            {/* CONTENT TAB */}
            <TabsContent value="content" className="space-y-6 mt-6">
              {/* Widget Name, Welcome Message, Placeholder */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Widget Text</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="widgetName">Widget Name</Label>
                    <Input
                      id="widgetName"
                      value={config?.widgetName || ''}
                      onChange={(e) => updateConfig('widgetName', e.target.value)}
                      placeholder="Chat Widget"
                    />
                  </div>

                  <div>
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={config?.welcomeMessage || ''}
                      onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                      placeholder="Hi! How can we help you?"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="placeholderText">Placeholder Text</Label>
                    <Input
                      id="placeholderText"
                      value={config?.placeholderText || ''}
                      onChange={(e) => updateConfig('placeholderText', e.target.value)}
                      placeholder="Type your message..."
                    />
                  </div>
                </div>
              </Card>

              {/* Data Collection */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Data Collection</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="collectName">Collect Name</Label>
                    <Switch
                      id="collectName"
                      checked={config?.collectName || false}
                      onCheckedChange={(checked) => updateConfig('collectName', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="collectEmail">Collect Email</Label>
                    <Switch
                      id="collectEmail"
                      checked={config?.collectEmail || false}
                      onCheckedChange={(checked) => updateConfig('collectEmail', checked)}
                    />
                  </div>

                  {config?.collectEmail && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="requireEmail">Require Email</Label>
                      <Switch
                        id="requireEmail"
                        checked={config?.requireEmail || false}
                        onCheckedChange={(checked) => updateConfig('requireEmail', checked)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="collectPhone">Collect Phone</Label>
                    <Switch
                      id="collectPhone"
                      checked={config?.collectPhone || false}
                      onCheckedChange={(checked) => updateConfig('collectPhone', checked)}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* STYLE TAB */}
            <TabsContent value="style" className="space-y-6 mt-6">
              {/* Appearance */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={config?.primaryColor || '#2563eb'}
                        onChange={(e) => updateConfig('primaryColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={config?.primaryColor || '#2563eb'}
                        onChange={(e) => updateConfig('primaryColor', e.target.value)}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={config?.accentColor || '#1e40af'}
                        onChange={(e) => updateConfig('accentColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={config?.accentColor || '#1e40af'}
                        onChange={(e) => updateConfig('accentColor', e.target.value)}
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="position">Widget Position</Label>
                    <select
                      id="position"
                      value={config?.position || 'bottom-right'}
                      onChange={(e) => updateConfig('position', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Behaviour */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Behaviour</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Widget Enabled</Label>
                    <Switch
                      id="enabled"
                      checked={config?.enabled || false}
                      onCheckedChange={(checked) => updateConfig('enabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoBot" className={!hasLLMConfig ? 'text-gray-400' : ''}>
                        AI Auto-Response
                      </Label>
                      {!hasLLMConfig ? (
                        <p className="text-sm text-orange-600">
                          ⚠️ Configure LLM settings first in{' '}
                          <Link href="/dashboard/llm-config" className="underline font-medium">
                            Bot Settings
                          </Link>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Bot responds automatically to widget messages</p>
                      )}
                    </div>
                    <Switch
                      id="autoBot"
                      checked={config?.autoBot || false}
                      onCheckedChange={(checked) => {
                        if (!hasLLMConfig && checked) {
                          toast({
                            title: 'LLM Configuration Required',
                            description: 'Please configure your LLM provider in Bot Settings before enabling auto-response.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        updateConfig('autoBot', checked);
                      }}
                      disabled={!hasLLMConfig}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoOpen">Auto Open</Label>
                      <p className="text-sm text-gray-500">Open widget automatically</p>
                    </div>
                    <Switch
                      id="autoOpen"
                      checked={config?.autoOpen || false}
                      onCheckedChange={(checked) => updateConfig('autoOpen', checked)}
                    />
                  </div>

                  {config?.autoOpen && (
                    <div>
                      <Label htmlFor="autoOpenDelay">Auto Open Delay (ms)</Label>
                      <Input
                        id="autoOpenDelay"
                        type="number"
                        value={config?.autoOpenDelay || 3000}
                        onChange={(e) => updateConfig('autoOpenDelay', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* EMBED TAB */}
            <TabsContent value="embed" className="space-y-6 mt-6">
              {/* Allowed Domains */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Allowed Domains</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Restrict where the widget can be displayed. Leave empty to allow all domains.
                </p>
                
                <div className="space-y-3">
                  {(config?.allowedDomains || []).length === 0 && (
                    <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-md">
                      No restrictions - widget will work on any domain
                    </div>
                  )}
                  
                  {(config?.allowedDomains || []).map((domain: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={domain}
                        onChange={(e) => updateAllowedDomain(index, e.target.value)}
                        placeholder="https://example.com or example.com"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeAllowedDomain(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addAllowedDomain}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Button>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Examples:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">https://example.com</code> - Only this exact domain</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">example.com</code> - Works with http and https</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">*.example.com</code> - All subdomains</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">localhost</code> - For local development</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Tip: If widget doesn&apos;t appear, check browser console for domain mismatch errors
                    </p>
                  </div>
                </div>
              </Card>

              {/* Widget Setup Code */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Widget Setup Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Copy this code and paste it before the closing &lt;/body&gt; tag on your website
                </p>
                
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{getEmbedCode()}</code>
                  </pre>
                </div>

                <Button onClick={copyEmbedCode} variant="outline" className="w-full">
                  Copy Embed Code
                </Button>
              </Card>

              {/* Installation Instructions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Installation Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Copy the embed code above</li>
                  <li>Open your website&apos;s HTML file</li>
                  <li>Paste the code before the closing &lt;/body&gt; tag</li>
                  <li>Save and publish your website</li>
                  <li>The widget will appear on all pages where the code is added</li>
                </ol>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button - Always visible */}
          <Button onClick={saveConfig} disabled={saving} className="w-full" size="lg">
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Right Column - Preview (1/3 width, sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              <p className="text-sm text-gray-500 mb-4">
                This is how your widget will appear on your website
              </p>
            
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-lg relative" style={{ height: '450px' }}>
              {/* Preview background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-8 gap-4 h-full">
                  {[...Array(32)].map((_, i) => (
                    <div key={i} className="bg-gray-400 rounded"></div>
                  ))}
                </div>
              </div>

              {/* Chat Widget Preview */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  zIndex: 10,
                }}
              >
                {/* Chat Window */}
                {previewOpen && (
                  <div
                    style={{
                      width: '350px',
                      height: '500px',
                      marginBottom: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        background: config?.primaryColor || '#2563eb',
                        color: 'white',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                          {config?.widgetName || 'Chat Widget'}
                        </h3>
                        <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                          We typically reply in a few minutes
                        </p>
                      </div>
                      <button
                        onClick={() => setPreviewOpen(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: '4px',
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Messages Area */}
                    <div
                      style={{
                        flex: 1,
                        padding: '16px',
                        overflowY: 'auto',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      {/* Welcome Message */}
                      <div style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            maxWidth: '85%',
                          }}
                        >
                          <p style={{ fontSize: '14px', margin: 0, color: '#374151' }}>
                            {config?.welcomeMessage || 'Hi! How can we help you?'}
                          </p>
                        </div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
                          Just now
                        </p>
                      </div>

                      {/* Sample User Message */}
                      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div>
                          <div
                            style={{
                              backgroundColor: config?.primaryColor || '#2563eb',
                              color: 'white',
                              padding: '12px',
                              borderRadius: '12px',
                              maxWidth: '85%',
                            }}
                          >
                            <p style={{ fontSize: '14px', margin: 0 }}>
                              Hello! I have a question about your services.
                            </p>
                          </div>
                          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0, textAlign: 'right' }}>
                            Just now
                          </p>
                        </div>
                      </div>

                      {/* Typing Indicator */}
                      <div style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            maxWidth: '60px',
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d1d5db', animation: 'pulse 1.4s infinite' }}></div>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d1d5db', animation: 'pulse 1.4s infinite 0.2s' }}></div>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d1d5db', animation: 'pulse 1.4s infinite 0.4s' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Input Area */}
                    <div
                      style={{
                        padding: '16px',
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <input
                          type="text"
                          placeholder={config?.placeholderText || 'Type your message...'}
                          disabled
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: '#f9fafb',
                          }}
                        />
                        <button
                          disabled
                          style={{
                            backgroundColor: config?.primaryColor || '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Button */}
                <div
                  onClick={() => setPreviewOpen(!previewOpen)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: config?.primaryColor || '#2563eb',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {previewOpen ? (
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  ) : (
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Installation Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Copy the embed code above</li>
              <li>Open your website&apos;s HTML file</li>
              <li>Paste the code before the closing &lt;/body&gt; tag</li>
              <li>Save and publish your website</li>
              <li>The widget will appear on all pages where the code is added</li>
            </ol>
          </Card>

            </Card>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
