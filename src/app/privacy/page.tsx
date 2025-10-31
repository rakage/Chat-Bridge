/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - ChatBridge",
  description: "Privacy Policy for ChatBridge - Omnichannel Customer Messaging Platform",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-gray max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to ChatBridge ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our omnichannel customer messaging platform.
              </p>
              <p className="text-gray-700 mb-4">
                ChatBridge is a Customer Relationship Management (CRM) platform that enables businesses to manage customer conversations from multiple channels including Facebook Messenger, Instagram Direct Messages, Telegram, and website chat widgets in one unified dashboard.
              </p>
              <p className="text-gray-700">
                By using our services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Information You Provide Directly</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, company name, password, and profile information</li>
                <li><strong>Business Information:</strong> Company details, business type, contact information</li>
                <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely by third-party payment processors)</li>
                <li><strong>Support Communications:</strong> Information you provide when contacting our support team</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Information from Third-Party Platforms</h3>
              <p className="text-gray-700 mb-4">
                When you connect your social media accounts to ChatBridge, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Facebook/Instagram:</strong>
                  <ul className="list-circle pl-6 mt-2 space-y-1">
                    <li>Page/Account IDs, names, usernames, profile pictures</li>
                    <li>Page access tokens (encrypted)</li>
                    <li>Customer messages (Direct Messages from Facebook Messenger and Instagram)</li>
                    <li>Customer Page-Scoped IDs (PSIDs) - anonymized customer identifiers</li>
                    <li>Message metadata (timestamps, read status, delivery status)</li>
                  </ul>
                </li>
                <li><strong>Telegram:</strong>
                  <ul className="list-circle pl-6 mt-2 space-y-1">
                    <li>Bot tokens (encrypted)</li>
                    <li>Bot names and usernames</li>
                    <li>Customer messages sent to your Telegram bots</li>
                    <li>Customer Telegram IDs and usernames</li>
                  </ul>
                </li>
                <li><strong>Widget Conversations:</strong> Messages exchanged through chat widgets embedded on your website</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click data</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device type, IP address</li>
                <li><strong>Log Data:</strong> Access times, error logs, performance data</li>
                <li><strong>Cookies and Similar Technologies:</strong> Session cookies, authentication tokens, preference settings</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the collected information for the following purposes:</p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Core Service Delivery</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Display customer conversations in your unified dashboard</li>
                <li>Enable sending and receiving messages across multiple platforms</li>
                <li>Provide real-time notifications for new messages</li>
                <li>Store conversation history for customer support purposes</li>
                <li>Enable team collaboration features (message assignment, notes, tags)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 AI-Powered Features</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Generate automated responses using AI (when enabled by you)</li>
                <li>Process message content to provide relevant AI-generated replies</li>
                <li>Improve AI response quality using your company's knowledge base</li>
                <li><strong>Important:</strong> Message content sent to AI providers (OpenAI, Google Gemini) is processed only for generating responses and is NOT used to train their models</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Service Improvement and Analytics</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Analyze usage patterns to improve features and user experience</li>
                <li>Monitor system performance and reliability</li>
                <li>Identify and fix technical issues</li>
                <li>Develop new features based on user needs</li>
                <li>Generate anonymized, aggregated statistics</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4 Communication and Support</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Respond to your support requests and inquiries</li>
                <li>Send service updates and security notifications</li>
                <li>Provide product updates and feature announcements (with opt-out option)</li>
                <li>Send billing and account-related communications</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.5 Security and Legal Compliance</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Protect against fraud, abuse, and security threats</li>
                <li>Enforce our Terms of Service and policies</li>
                <li>Comply with legal obligations and law enforcement requests</li>
                <li>Resolve disputes and troubleshoot problems</li>
              </ul>
            </section>

            {/* Data Processors and Third Parties */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Processors and Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                We work with trusted third-party service providers to deliver our services. These processors have access to your data only to perform specific tasks on our behalf and are obligated to protect your information:
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Data Processing Agreements:</strong> All our service providers operate under Data Processing Agreements (DPAs) and comply with GDPR and other applicable data protection regulations.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Infrastructure Providers</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Supabase (Database):</strong> Stores conversation data, user accounts, and encrypted access tokens. GDPR-compliant with data centers in multiple regions.</li>
                <li><strong>Cloudflare R2 (File Storage):</strong> Stores message attachments, images, and uploaded files. Data encrypted in transit and at rest.</li>
                <li><strong>Upstash Redis:</strong> Temporary storage for message queues and real-time events. Data automatically expires after processing.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 AI Service Providers</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>OpenAI:</strong> Processes message text to generate AI responses. Data is NOT used for training models (API tier).</li>
                <li><strong>Google Gemini:</strong> Alternative AI provider for response generation. Data is NOT used for training models.</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                <p className="text-sm text-yellow-900">
                  <strong>Important:</strong> We ONLY send message text content to AI providers. We do NOT share user IDs, access tokens, PSIDs, or any identifying information with AI services.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Platform Integrations</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Meta (Facebook/Instagram):</strong> We use Meta's APIs to receive and send messages on your behalf. See Meta's Privacy Policy.</li>
                <li><strong>Telegram:</strong> We use Telegram's Bot API for message delivery. See Telegram's Privacy Policy.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Analytics and Monitoring</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Application Performance Monitoring:</strong> Error tracking and performance monitoring (anonymized data only)</li>
                <li><strong>Usage Analytics:</strong> Aggregated, non-identifiable usage statistics</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. When We Share Your Information</h2>
              <p className="text-gray-700 mb-4">We do NOT sell your personal data. We only share your information in the following limited circumstances:</p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 With Your Consent</h3>
              <p className="text-gray-700 mb-4">
                We will share your information when you explicitly authorize us to do so.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                With data processors listed in Section 4, who assist in providing our services under strict confidentiality obligations.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information if required by law, legal process, or government request, including but not limited to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Comply with valid court orders or subpoenas</li>
                <li>Respond to lawful requests from public authorities (with legal review)</li>
                <li>Protect our rights, property, or safety and that of our users</li>
                <li>Detect, prevent, or address fraud, security, or technical issues</li>
              </ul>

              <div className="bg-gray-100 border-l-4 border-gray-500 p-4 mb-4">
                <p className="text-sm text-gray-800">
                  <strong>Legal Request Policy:</strong> We review all data requests for legal validity, minimize data disclosure to only what is legally required, and document all requests (except where prohibited by law).
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred. We will notify you of any such change and your choices regarding your information.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.5 What We DON'T Do</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>❌ We do NOT sell your data to third parties</li>
                <li>❌ We do NOT share data with advertisers for targeting</li>
                <li>❌ We do NOT use customer message content for marketing</li>
                <li>❌ We do NOT train AI models on your customer conversations</li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Technical Safeguards</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Encryption:</strong> All access tokens and sensitive data encrypted at rest using AES-256</li>
                <li><strong>Secure Transmission:</strong> All communications use HTTPS/TLS encryption</li>
                <li><strong>Database Security:</strong> Encrypted database connections, regular backups</li>
                <li><strong>Access Controls:</strong> Role-based access control (RBAC), multi-factor authentication support</li>
                <li><strong>Network Security:</strong> Firewall protection, DDoS mitigation</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Organizational Safeguards</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Multi-Tenant Isolation:</strong> Company data strictly isolated - one company cannot access another's data</li>
                <li><strong>Limited Access:</strong> Only authorized personnel have access to user data</li>
                <li><strong>Security Audits:</strong> Regular security assessments and vulnerability testing</li>
                <li><strong>Incident Response:</strong> Documented procedures for handling security incidents</li>
                <li><strong>Employee Training:</strong> Staff trained on data protection best practices</li>
              </ul>

              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
                <p className="text-sm text-orange-900">
                  <strong>No Absolute Security:</strong> While we implement strong security measures, no system is 100% secure. We cannot guarantee absolute security but are committed to protecting your data using industry best practices.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">We retain your information for as long as necessary to provide our services and comply with legal obligations:</p>

              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Active Account Data:</strong> Retained while your account is active and for legitimate business purposes</li>
                <li><strong>Conversation Data:</strong> Stored as long as you maintain an active integration. Deleted when you disconnect the integration.</li>
                <li><strong>Account Data After Closure:</strong> Retained for 90 days after account closure (for account recovery), then permanently deleted</li>
                <li><strong>Legal/Compliance Data:</strong> May be retained longer if required by law or for legal defense</li>
                <li><strong>Anonymized Analytics:</strong> Aggregated, anonymized data may be retained indefinitely for analytics</li>
                <li><strong>Backup Data:</strong> May persist in backups for up to 90 days after deletion</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Access and Portability</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Data Portability:</strong> Export your conversation data in a structured format</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Correction and Deletion</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Right to Rectification:</strong> Correct inaccurate personal information</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
                <li><strong>Account Deletion:</strong> Close your account and delete all associated data</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.3 Control and Objection</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Object to Processing:</strong> Object to certain data processing activities</li>
                <li><strong>Withdraw Consent:</strong> Revoke previously granted permissions</li>
                <li><strong>Opt-Out of Communications:</strong> Unsubscribe from marketing emails</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.4 Integration Controls</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Disconnect Integrations:</strong> Remove Facebook, Instagram, or Telegram connections at any time</li>
                <li><strong>AI Toggle:</strong> Enable or disable AI auto-response per integration</li>
                <li><strong>Team Access:</strong> Control which team members have access to conversations</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.5 How to Exercise Your Rights</h3>
              <p className="text-gray-700 mb-4">
                To exercise any of these rights, please:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Email us at: <a href="mailto:privacy@chatbridge.raka.my.id" className="text-blue-600 hover:underline">privacy@chatbridge.raka.my.id</a></li>
                <li>Use the account settings in your dashboard</li>
                <li>Contact our support team with your request</li>
              </ul>
              <p className="text-gray-700 mb-4">
                We will respond to your request within 30 days and may need to verify your identity before processing your request.
              </p>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws different from your jurisdiction.
              </p>
              <p className="text-gray-700 mb-4">
                When we transfer data internationally, we ensure appropriate safeguards are in place:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Data Processing Agreements with all service providers</li>
                <li>Compliance with GDPR, CCPA, and other applicable data protection laws</li>
                <li>Server locations in regions with adequate data protection (e.g., EU, Singapore)</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                ChatBridge is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If you believe we have collected information from a child under 16, please contact us immediately and we will take steps to delete such information.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
              </p>
              <p className="text-gray-700 mb-4">
                When we make changes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>We will update the "Last Updated" date at the top of this policy</li>
                <li>For material changes, we will notify you via email or dashboard notification</li>
                <li>Continued use of our services after changes constitutes acceptance of the updated policy</li>
                <li>Previous versions will be archived and available upon request</li>
              </ul>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              
              <div className="bg-blue-50 rounded-lg p-6 mb-4">
                <h3 className="font-semibold text-gray-900 mb-4">ChatBridge Privacy Team</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Email:</strong> <a href="mailto:privacy@chatbridge.raka.my.id" className="text-blue-600 hover:underline">privacy@chatbridge.raka.my.id</a></li>
                  <li><strong>Support:</strong> <a href="mailto:support@chatbridge.raka.my.id" className="text-blue-600 hover:underline">support@chatbridge.raka.my.id</a></li>
                  <li><strong>Website:</strong> <a href="https://chatbridge.raka.my.id" className="text-blue-600 hover:underline">https://chatbridge.raka.my.id</a></li>
                  <li><strong>Response Time:</strong> We aim to respond to all privacy inquiries within 30 days</li>
                </ul>
              </div>

              <div className="bg-gray-100 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Data Protection Officer (if applicable)</h3>
                <p className="text-gray-700 text-sm">
                  For residents of the European Economic Area (EEA) or where required by law, you can contact our Data Protection Officer at: <a href="mailto:dpo@chatbridge.raka.my.id" className="text-blue-600 hover:underline">dpo@chatbridge.raka.my.id</a>
                </p>
              </div>
            </section>

            {/* Additional Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Additional Information for Specific Regions</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.1 For European Users (GDPR)</h3>
              <p className="text-gray-700 mb-4">
                If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Legal Basis:</strong> We process your data based on consent, contract performance, legitimate interests, or legal obligations</li>
                <li><strong>Right to Lodge Complaint:</strong> You have the right to lodge a complaint with your local data protection authority</li>
                <li><strong>Data Protection Officer:</strong> Contact dpo@chatbridge.raka.my.id</li>
                <li><strong>Representative:</strong> We appoint EU representatives as required by GDPR Article 27</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.2 For California Users (CCPA/CPRA)</h3>
              <p className="text-gray-700 mb-4">
                If you are a California resident:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Right to Know:</strong> Request categories and specific pieces of personal information collected</li>
                <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
                <li><strong>Right to Opt-Out:</strong> Opt-out of "sale" of personal information (we don't sell data)</li>
                <li><strong>Right to Non-Discrimination:</strong> We won't discriminate for exercising your rights</li>
                <li><strong>Authorized Agent:</strong> You may designate an authorized agent to make requests on your behalf</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.3 For Other Jurisdictions</h3>
              <p className="text-gray-700 mb-4">
                We comply with applicable data protection laws in all jurisdictions where we operate. Contact us for region-specific information.
              </p>
            </section>

            {/* Acknowledgment */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Your Acknowledgment</h2>
              <p className="text-gray-700 mb-4">
                By using ChatBridge, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with this policy, please do not use our services.
              </p>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                This Privacy Policy was last updated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                <br />
                ChatBridge is committed to protecting your privacy and ensuring transparent data practices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
