import { supabase } from "@/integrations/supabase/client";

// File upload security constants
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mov',
  'video/avi',
  'video/wmv',
  'video/flv',
  'video/webm',
  'video/mkv'
];
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UploadAuditData {
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_type: 'video' | 'thumbnail';
  status: 'success' | 'failed' | 'rejected';
  ip_address?: string;
  user_agent?: string;
}

export interface AdminActionData {
  admin_id: string;
  action_type: string;
  target_user_id?: string;
  target_resource_id?: string;
  details?: any;
}

/**
 * Validates file type and size for security
 */
export const validateFile = (
  file: File, 
  type: 'video' | 'image'
): FileValidationResult => {
  const allowedTypes = type === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  // Check file type
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File too large. Maximum size: ${sizeMB}MB`
    };
  }

  // Check for suspicious file characteristics
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      isValid: false,
      error: 'Invalid file name. File names cannot contain path characters.'
    };
  }

  // Check for executable extensions in file name
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.js', '.vbs'];
  const lowerFileName = file.name.toLowerCase();
  if (suspiciousExtensions.some(ext => lowerFileName.includes(ext))) {
    return {
      isValid: false,
      error: 'File name contains suspicious extensions.'
    };
  }

  return { isValid: true };
};

/**
 * Logs file upload attempts to audit table
 */
export const logUploadAudit = async (data: UploadAuditData): Promise<void> => {
  try {
    const { error } = await supabase
      .from('upload_audit')
      .insert({
        user_id: data.user_id,
        file_name: data.file_name,
        file_size: data.file_size,
        file_type: data.file_type,
        upload_type: data.upload_type,
        status: data.status,
        ip_address: data.ip_address,
        user_agent: data.user_agent
      });

    if (error) {
      console.error('Failed to log upload audit:', error);
    }
  } catch (error) {
    console.error('Error logging upload audit:', error);
  }
};

/**
 * Logs admin actions to audit table
 */
export const logAdminAction = async (data: AdminActionData): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_actions')
      .insert({
        admin_id: data.admin_id,
        action_type: data.action_type,
        target_user_id: data.target_user_id,
        target_resource_id: data.target_resource_id,
        details: data.details
      });

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};

/**
 * Sanitizes file name for safe storage
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
};

/**
 * Gets client IP address (best effort)
 */
export const getClientIP = (): string | undefined => {
  // This is a client-side function, so IP detection is limited
  // In a real production environment, you'd want to get this from the server
  return undefined;
};

/**
 * Gets user agent string
 */
export const getUserAgent = (): string => {
  return navigator.userAgent;
};