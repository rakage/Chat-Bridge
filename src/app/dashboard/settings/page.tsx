"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Eye,
  EyeOff,
  Upload,
  Camera,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(session?.user?.image || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update photoUrl when session changes
  useEffect(() => {
    if (session?.user?.image) {
      setPhotoUrl(session.user.image);
    }
  }, [session?.user?.image]);

  const [profileSettings, setProfileSettings] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileSave = async () => {
    setLoading(true);
    // TODO: Implement profile update API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, and WebP images are allowed",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/settings/profile/photo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload photo");
      }

      // Immediately update the photo URL in local state
      setPhotoUrl(data.photoUrl);
      
      // Update session with new photo
      await updateSession();
      
      toast({
        title: "Success!",
        description: "Your profile photo has been updated",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) {
      return;
    }

    setUploadingPhoto(true);

    try {
      const response = await fetch("/api/settings/profile/photo", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete photo");
      }

      // Immediately clear the photo URL in local state
      setPhotoUrl("");
      
      // Update session
      await updateSession();
      
      toast({
        title: "Photo removed",
        description: "Your profile photo has been removed",
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Profile Settings</span>
            </CardTitle>
            <CardDescription>
              Update your personal information and password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input
                type="text"
                value={profileSettings.name}
                onChange={(e) =>
                  setProfileSettings((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={profileSettings.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Contact an administrator if needed.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Change Password
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={profileSettings.currentPassword}
                      onChange={(e) =>
                        setProfileSettings((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={profileSettings.newPassword}
                      onChange={(e) =>
                        setProfileSettings((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={profileSettings.confirmPassword}
                    onChange={(e) =>
                      setProfileSettings((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleProfileSave}
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Profile Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-purple-600" />
              <span>Profile Photo</span>
            </CardTitle>
            <CardDescription>
              Upload your profile photo to personalize your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Preview */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage 
                  src={photoUrl || session?.user?.image || ""} 
                  alt={session?.user?.name || "User"} 
                />
                <AvatarFallback className="text-3xl bg-blue-100 text-blue-600">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500">
                  {session?.user?.email}
                </p>
              </div>
            </div>

            {/* Upload Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Photo Requirements
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Maximum file size: 5MB</li>
                <li>• Supported formats: JPEG, PNG, WebP</li>
                <li>• Recommended: Square image (1:1 ratio)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full"
                variant="default"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPhoto ? "Uploading..." : "Upload New Photo"}
              </Button>

              {(photoUrl || session?.user?.image) && (
                <Button
                  onClick={handlePhotoDelete}
                  disabled={uploadingPhoto}
                  className="w-full"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>Your current role and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Role</h4>
              <p className="text-lg font-semibold text-blue-600">
                {session?.user?.role}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Company</h4>
              <p className="text-lg text-gray-700">
                {session?.user?.companyName || "No Company"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Member Since
              </h4>
              <p className="text-lg text-gray-700">
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
