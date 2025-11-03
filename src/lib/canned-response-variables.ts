/**
 * Variable replacement system for canned responses
 * Supports variables like {{name}}, {{email}}, {{platform}}, etc.
 */

export interface VariableContext {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  platform?: string;
  agentName?: string;
  companyName?: string;
  conversationId?: string;
  [key: string]: string | undefined;
}

/**
 * Available variables that can be used in canned responses
 */
export const AVAILABLE_VARIABLES = [
  { key: 'name', label: 'Customer Name', example: 'John Doe' },
  { key: 'first_name', label: 'Customer First Name', example: 'John' },
  { key: 'email', label: 'Customer Email', example: 'john@example.com' },
  { key: 'phone', label: 'Customer Phone', example: '+1234567890' },
  { key: 'platform', label: 'Platform', example: 'Facebook' },
  { key: 'agent_name', label: 'Agent Name', example: 'Jane Smith' },
  { key: 'company_name', label: 'Company Name', example: 'ACME Corp' },
];

/**
 * Replace variables in template with actual values
 */
export function replaceVariables(
  template: string,
  context: VariableContext
): string {
  let result = template;

  // Replace {{name}} with customer name
  if (context.customerName) {
    result = result.replace(/\{\{name\}\}/gi, context.customerName);
    
    // Extract first name for {{first_name}}
    const firstName = context.customerName.split(' ')[0];
    result = result.replace(/\{\{first_name\}\}/gi, firstName);
  } else {
    // Fallback if no name available
    result = result.replace(/\{\{name\}\}/gi, 'there');
    result = result.replace(/\{\{first_name\}\}/gi, 'there');
  }

  // Replace {{email}}
  if (context.customerEmail) {
    result = result.replace(/\{\{email\}\}/gi, context.customerEmail);
  } else {
    result = result.replace(/\{\{email\}\}/gi, '[email]');
  }

  // Replace {{phone}}
  if (context.customerPhone) {
    result = result.replace(/\{\{phone\}\}/gi, context.customerPhone);
  } else {
    result = result.replace(/\{\{phone\}\}/gi, '[phone]');
  }

  // Replace {{platform}}
  if (context.platform) {
    result = result.replace(/\{\{platform\}\}/gi, context.platform);
  }

  // Replace {{agent_name}}
  if (context.agentName) {
    result = result.replace(/\{\{agent_name\}\}/gi, context.agentName);
  }

  // Replace {{company_name}}
  if (context.companyName) {
    result = result.replace(/\{\{company_name\}\}/gi, context.companyName);
  }

  // Replace any custom variables
  Object.keys(context).forEach((key) => {
    const value = context[key];
    if (value && !['customerName', 'customerEmail', 'customerPhone', 'platform', 'agentName', 'companyName'].includes(key)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, value);
    }
  });

  return result;
}

/**
 * Extract variables used in a template
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{([a-z_]+)\}\}/gi;
  const matches = template.match(regex);
  
  if (!matches) return [];
  
  const uniqueVars = new Set(matches.map(match => 
    match.replace(/\{\{|\}\}/g, '').toLowerCase()
  ));
  
  return Array.from(uniqueVars);
}

/**
 * Validate if all variables in template are supported
 */
export function validateVariables(template: string): { 
  valid: boolean; 
  unsupported: string[] 
} {
  const used = extractVariables(template);
  const supported = AVAILABLE_VARIABLES.map(v => v.key);
  const unsupported = used.filter(v => !supported.includes(v));
  
  return {
    valid: unsupported.length === 0,
    unsupported,
  };
}

/**
 * Get preview of template with example data
 */
export function getPreview(template: string): string {
  const exampleContext: VariableContext = {
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
    platform: 'Facebook',
    agentName: 'Jane Smith',
    companyName: 'ACME Corp',
  };
  
  return replaceVariables(template, exampleContext);
}
