import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">
              Terms of Service
            </h1>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>Agreement to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
              <p>
                By accessing and using the Salsation Bot Dashboard
                (&quot;Service&quot;), you agree to be bound by these Terms of
                Service (&quot;Terms&quot;). If you disagree with any part of
                these terms, you may not access the Service.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle>Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Salsation Bot Dashboard is a web application that enables
                users to manage Facebook Messenger chatbots with real-time
                conversations and AI integration. Our service provides:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Real-time conversation monitoring and management</li>
                <li>AI-powered chatbot responses</li>
                <li>Customer support ticket integration</li>
                <li>Analytics and reporting features</li>
                <li>Document processing and knowledge base management</li>
              </ul>
            </CardContent>
          </Card>

          {/* User Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                To access certain features of the Service, you must create an
                account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Maintaining the confidentiality of your account credentials
                </li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Promptly updating your account information</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </CardContent>
          </Card>

          {/* Acceptable Use */}
          <Card>
            <CardHeader>
              <CardTitle>Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>
                  Send spam, malicious content, or unauthorized communications
                </li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>
                  Access the Service through automated means without permission
                </li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Upload or transmit malicious code or viruses</li>
                <li>Impersonate others or provide false information</li>
              </ul>
            </CardContent>
          </Card>

          {/* Privacy and Data */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Your privacy is important to us. By using the Service, you
                acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  We collect and process data as described in our Privacy Policy
                </li>
                <li>
                  You are responsible for obtaining necessary consents for
                  customer data
                </li>
                <li>
                  We implement reasonable security measures to protect your data
                </li>
                <li>You retain ownership of your content and data</li>
                <li>We may use anonymized data for service improvement</li>
              </ul>
            </CardContent>
          </Card>

          {/* Third-Party Services */}
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Our Service integrates with third-party platforms including
                Facebook Messenger, AI services, and support systems. You
                acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Third-party services have their own terms and policies</li>
                <li>
                  We are not responsible for third-party service availability or
                  performance
                </li>
                <li>
                  Integration functionality may change based on third-party
                  updates
                </li>
                <li>You must comply with all applicable third-party terms</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                While we strive to maintain high availability, we do not
                guarantee uninterrupted service. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Perform maintenance and updates</li>
                <li>Modify or discontinue features</li>
                <li>Suspend access for violations or security reasons</li>
                <li>Implement usage limits to ensure fair use</li>
              </ul>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Service and its original content, features, and
                functionality are and will remain the exclusive property of
                Salsation and its licensors. You retain rights to your content,
                but grant us a license to use it for providing the Service.
              </p>
            </CardContent>
          </Card>

          {/* Disclaimers */}
          <Card>
            <CardHeader>
              <CardTitle>Disclaimers and Limitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Service is provided &quot;as is&quot; without warranties of
                any kind. We disclaim all warranties, express or implied,
                including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Merchantability and fitness for a particular purpose</li>
                <li>Accuracy or completeness of AI-generated responses</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Security of data transmission</li>
              </ul>
              <p className="mt-4">
                Our liability is limited to the maximum extent permitted by law.
                We shall not be liable for any indirect, incidental, special, or
                consequential damages.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Either party may terminate this agreement at any time. Upon
                termination:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Your access to the Service will be immediately suspended
                </li>
                <li>
                  We will make reasonable efforts to provide data export options
                </li>
                <li>
                  All provisions that should survive termination will remain in
                  effect
                </li>
                <li>You remain responsible for any outstanding obligations</li>
              </ul>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We reserve the right to modify these Terms at any time. We will
                notify users of material changes through the Service or via
                email. Continued use of the Service after changes constitutes
                acceptance of the new Terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                If you have any questions about these Terms of Service, please
                contact us at:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium text-foreground">Salsation Support</p>
                <p>Email: support@salsation.com</p>
                <p>Website: salsation.com</p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8 border-t">
            <p className="text-sm text-muted-foreground">
              By using the Salsation Bot Dashboard, you acknowledge that you
              have read, understood, and agree to be bound by these Terms of
              Service.
            </p>
            <div className="mt-4">
              <Link href="/">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
