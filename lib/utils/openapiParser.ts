import openApiSpec from '@/openapi.json';

export interface APIEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  requestBody?: {
    required?: boolean;
    content?: {
      [contentType: string]: {
        schema?: any;
        example?: any;
      };
    };
  };
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: any;
    description?: string;
  }>;
  responses?: {
    [statusCode: string]: {
      description?: string;
      content?: {
        [contentType: string]: {
          schema?: any;
          example?: any;
        };
      };
    };
  };
  tags?: string[];
}

export interface ParsedAPIEndpoint extends APIEndpoint {
  requestBodySchema?: any;
  requestBodyExample?: any;
  responseSchema?: any;
  responseExample?: any;
  pathParams?: Array<{
    name: string;
    required?: boolean;
    schema?: any;
    description?: string;
  }>;
  queryParams?: Array<{
    name: string;
    required?: boolean;
    schema?: any;
    description?: string;
  }>;
}

/**
 * Extract schema from reference or return direct schema
 */
const resolveSchema = (schema: any): any => {
  if (!schema) return null;
  
  // Handle $ref references
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/', '').split('/');
    let resolved: any = openApiSpec;
    
    for (const part of refPath) {
      resolved = resolved?.[part];
    }
    
    return resolved || schema;
  }
  
  return schema;
};

/**
 * Normalize path by replacing all path parameters with a generic placeholder
 * This allows matching paths with different parameter names
 * Example: /users/{id} and /users/{userId} both become /users/{param}
 */
const normalizePath = (path: string): string => {
  return path.replace(/\{[^}]+\}/g, '{param}');
};

/**
 * Find matching OpenAPI path for a given path (handles parameter name variations)
 */
const findMatchingPath = (targetPath: string, spec: any): string | null => {
  if (!spec.paths) return null;
  
  // First try exact match
  if (spec.paths[targetPath]) {
    return targetPath;
  }
  
  // Normalize target path for comparison
  const normalizedTarget = normalizePath(targetPath.toLowerCase());
  
  // Try to find a matching path with different parameter names
  for (const specPath of Object.keys(spec.paths)) {
    const normalizedSpec = normalizePath(specPath.toLowerCase());
    
    if (normalizedSpec === normalizedTarget) {
      return specPath;
    }
  }
  
  return null;
};

/**
 * Parse OpenAPI spec to extract endpoint details
 */
export const getEndpointDetails = (
  path: string,
  method: string
): ParsedAPIEndpoint | null => {
  const spec = openApiSpec as any;
  
  // Find matching path (handles parameter name variations)
  const matchedPath = findMatchingPath(path, spec);
  
  if (!matchedPath) {
    console.warn(`[OpenAPIParser] Path not found: ${path}`);
    return null;
  }

  const pathSpec = spec.paths[matchedPath];
  const methodLower = method.toLowerCase();
  
  if (!pathSpec[methodLower]) {
    console.warn(`[OpenAPIParser] Method ${method} not found for path: ${matchedPath} (original: ${path})`);
    return null;
  }

  const endpoint = pathSpec[methodLower];
  
  // Extract request body details
  let requestBodySchema = null;
  let requestBodyExample = null;
  
  if (endpoint.requestBody) {
    const content = endpoint.requestBody.content;
    
    if (content) {
      // Try application/json first
      const jsonContent = content['application/json'];
      
      if (jsonContent) {
        requestBodySchema = resolveSchema(jsonContent.schema);
        requestBodyExample = jsonContent.example;
      }
    }
  }

  // Extract response details (try 200, 201, or first successful response)
  let responseSchema = null;
  let responseExample = null;
  
  if (endpoint.responses) {
    const successResponse = 
      endpoint.responses['200'] || 
      endpoint.responses['201'] || 
      endpoint.responses['202'] ||
      Object.values(endpoint.responses)[0];
    
    if (successResponse && typeof successResponse === 'object') {
      const content = (successResponse as any).content;
      
      if (content) {
        const jsonContent = content['application/json'];
        
        if (jsonContent) {
          responseSchema = resolveSchema(jsonContent.schema);
          responseExample = jsonContent.example;
        }
      }
    }
  }

  // Extract parameters (path and query)
  const pathParams: ParsedAPIEndpoint['pathParams'] = [];
  const queryParams: ParsedAPIEndpoint['queryParams'] = [];
  
  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      if (param.in === 'path') {
        pathParams.push(param);
      } else if (param.in === 'query') {
        queryParams.push(param);
      }
    }
  }

  return {
    path: matchedPath, // Use the actual OpenAPI path, not the RBAC path
    method: method.toUpperCase(),
    operationId: endpoint.operationId,
    summary: endpoint.summary,
    description: endpoint.description,
    requestBody: endpoint.requestBody,
    requestBodySchema,
    requestBodyExample,
    responseSchema,
    responseExample,
    parameters: endpoint.parameters,
    pathParams,
    queryParams,
    responses: endpoint.responses,
    tags: endpoint.tags,
  };
};

/**
 * Search for all endpoints matching a list of allowed paths
 */
export const getEndpointsFromPermissions = (
  methods: {
    DELETE?: string[];
    GET?: string[];
    PATCH?: string[];
    POST?: string[];
    PUT?: string[];
  }
): ParsedAPIEndpoint[] => {
  const endpoints: ParsedAPIEndpoint[] = [];
  
  // Iterate through each method and its paths
  for (const [method, paths] of Object.entries(methods)) {
    if (!paths || !Array.isArray(paths)) continue;
    
    for (const path of paths) {
      const endpointDetails = getEndpointDetails(path, method);
      
      if (endpointDetails) {
        endpoints.push(endpointDetails);
      }
    }
  }
  
  return endpoints;
};

/**
 * Group endpoints by tags or path prefix
 */
export const groupEndpointsByTag = (
  endpoints: ParsedAPIEndpoint[]
): Record<string, ParsedAPIEndpoint[]> => {
  const grouped: Record<string, ParsedAPIEndpoint[]> = {};
  
  for (const endpoint of endpoints) {
    // Use first tag if available, otherwise extract from path
    let tag = 'Other';
    
    if (endpoint.tags && endpoint.tags.length > 0) {
      tag = endpoint.tags[0];
    } else {
      // Extract first path segment as tag
      const pathSegments = endpoint.path.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        tag = pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1);
      }
    }
    
    if (!grouped[tag]) {
      grouped[tag] = [];
    }
    
    grouped[tag].push(endpoint);
  }
  
  return grouped;
};

/**
 * Generate example request body from schema
 */
export const generateExampleFromSchema = (schema: any): any => {
  if (!schema) return null;
  
  if (schema.example) return schema.example;
  
  if (schema.type === 'object' && schema.properties) {
    const example: any = {};
    
    for (const [key, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as any;
      
      if (propSchema.example !== undefined) {
        example[key] = propSchema.example;
      } else if (propSchema.default !== undefined) {
        example[key] = propSchema.default;
      } else {
        // Generate based on type
        switch (propSchema.type) {
          case 'string':
            example[key] = propSchema.format === 'email' ? 'user@example.com' : 
                          propSchema.format === 'date-time' ? new Date().toISOString() :
                          propSchema.format === 'date' ? new Date().toISOString().split('T')[0] :
                          'string';
            break;
          case 'number':
          case 'integer':
            example[key] = 0;
            break;
          case 'boolean':
            example[key] = false;
            break;
          case 'array':
            example[key] = [];
            break;
          case 'object':
            example[key] = {};
            break;
          default:
            example[key] = null;
        }
      }
    }
    
    return example;
  }
  
  if (schema.type === 'array' && schema.items) {
    return [generateExampleFromSchema(schema.items)];
  }
  
  return null;
};

