import { facebookOAuth } from './facebook-oauth';

export interface FacebookDiagnosticResult {
  success: boolean;
  issues: string[];
  recommendations: string[];
  permissions: Record<string, string>;
  pages: any[];
  rawResponse?: any;
}

export class FacebookDiagnostics {
  
  /**
   * Run comprehensive diagnostics on Facebook login
   */
  static async diagnoseLogin(accessToken: string): Promise<FacebookDiagnosticResult> {
    const result: FacebookDiagnosticResult = {
      success: false,
      issues: [],
      recommendations: [],
      permissions: {},
      pages: [],
    };

    try {
      // Check permissions
      console.log('🔍 Diagnosing Facebook permissions...');
      const permissionsResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/permissions?access_token=${accessToken}`
      );
      
      if (!permissionsResponse.ok) {
        result.issues.push('Failed to fetch permissions');
        return result;
      }

      const permissionsData = await permissionsResponse.json();
      
      // Map permissions
      for (const perm of permissionsData.data || []) {
        result.permissions[perm.permission] = perm.status;
      }

      console.log('🔍 Current permissions:', result.permissions);

      // Check required permissions
      const requiredPermissions = [
        'business_management',
        'pages_show_list',
        'pages_manage_metadata',
        'pages_messaging'
      ];

      const missingPermissions = requiredPermissions.filter(
        perm => result.permissions[perm] !== 'granted'
      );

      if (missingPermissions.length > 0) {
        result.issues.push(`Missing required permissions: ${missingPermissions.join(', ')}`);
        result.recommendations.push('Re-authorize the app and accept all required permissions');
      }

      // Check user pages
      console.log('🔍 Diagnosing Facebook pages...');
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,category,tasks,roles&access_token=${accessToken}`
      );

      if (!pagesResponse.ok) {
        const errorText = await pagesResponse.text();
        result.issues.push(`Failed to fetch pages: ${errorText}`);
        result.rawResponse = errorText;
      } else {
        const pagesData = await pagesResponse.json();
        result.pages = pagesData.data || [];
        result.rawResponse = pagesData;

        console.log('🔍 Raw pages response:', pagesData);

        if (result.pages.length === 0) {
          result.issues.push('No Facebook Pages found for this user');
          result.recommendations.push('Create a Facebook Page or ensure you have admin/editor access to existing pages');
          result.recommendations.push('Check if the Facebook account is a business account');
        } else {
          console.log(`🔍 Found ${result.pages.length} pages`);
          
          // Check page roles and permissions
          for (const page of result.pages) {
            console.log(`🔍 Page: ${page.name}`);
            console.log(`   - ID: ${page.id}`);
            console.log(`   - Category: ${page.category}`);
            console.log(`   - Tasks: ${page.tasks ? page.tasks.join(', ') : 'None'}`);
            console.log(`   - Roles: ${page.roles ? JSON.stringify(page.roles) : 'Not available'}`);
            
            if (!page.tasks || page.tasks.length === 0) {
              result.issues.push(`Page "${page.name}" has no management tasks/permissions`);
              result.recommendations.push(`Check your role on page "${page.name}" - you need admin or editor access`);
            }
          }
        }
      }

      // Check if user profile is accessible
      console.log('🔍 Checking user profile...');
      const profileResponse = await fetch(
        `https://graph.facebook.com/v23.0/me?fields=id,name,email&access_token=${accessToken}`
      );

      if (!profileResponse.ok) {
        result.issues.push('Failed to access user profile');
      } else {
        const profileData = await profileResponse.json();
        console.log('🔍 User profile:', profileData);
      }

      // Check if it's a business account
      console.log('🔍 Checking if user has business account...');
      try {
        const businessResponse = await fetch(
          `https://graph.facebook.com/v23.0/me/businesses?access_token=${accessToken}`
        );
        
        if (businessResponse.ok) {
          const businessData = await businessResponse.json();
          console.log('🔍 Business accounts:', businessData);
          
          if (!businessData.data || businessData.data.length === 0) {
            result.recommendations.push('Consider creating a Facebook Business account for better page management');
          }
        }
      } catch (businessError) {
        console.log('🔍 Business check failed (this is normal for personal accounts)');
      }

      // Final assessment
      result.success = result.issues.length === 0;

      if (!result.success) {
        result.recommendations.push('Try logging out and logging back in to Facebook');
        result.recommendations.push('Ensure you have the latest permissions approved');
      }

    } catch (error) {
      result.issues.push(`Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Generate diagnostic report
   */
  static generateReport(diagnostic: FacebookDiagnosticResult): string {
    let report = '\n=== Facebook Login Diagnostic Report ===\n';
    
    report += `Status: ${diagnostic.success ? '✅ SUCCESS' : '❌ ISSUES FOUND'}\n\n`;
    
    if (diagnostic.issues.length > 0) {
      report += '🚨 Issues Found:\n';
      diagnostic.issues.forEach((issue, i) => {
        report += `  ${i + 1}. ${issue}\n`;
      });
      report += '\n';
    }
    
    if (diagnostic.recommendations.length > 0) {
      report += '💡 Recommendations:\n';
      diagnostic.recommendations.forEach((rec, i) => {
        report += `  ${i + 1}. ${rec}\n`;
      });
      report += '\n';
    }
    
    report += '🔑 Permissions Status:\n';
    Object.entries(diagnostic.permissions).forEach(([perm, status]) => {
      const icon = status === 'granted' ? '✅' : '❌';
      report += `  ${icon} ${perm}: ${status}\n`;
    });
    report += '\n';
    
    report += `📄 Pages Found: ${diagnostic.pages.length}\n`;
    if (diagnostic.pages.length > 0) {
      diagnostic.pages.forEach((page, i) => {
        report += `  ${i + 1}. ${page.name} (${page.id})\n`;
        if (page.tasks && page.tasks.length > 0) {
          report += `     Tasks: ${page.tasks.join(', ')}\n`;
        }
      });
    }
    
    report += '\n==========================================\n';
    
    return report;
  }
}

export default FacebookDiagnostics;