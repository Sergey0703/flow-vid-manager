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

// Magic bytes for file type validation
const FILE_SIGNATURES = {
  // Video signatures
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp variant
  ],
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML
  'video/avi': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  
  // Image signatures
  'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP)
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
};

// Dangerous file signatures to explicitly reject
const DANGEROUS_SIGNATURES = [
  [0x4D, 0x5A], // PE executable (Windows .exe)
  [0x7F, 0x45, 0x4C, 0x46], // ELF executable (Linux)
  [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O executable (macOS)
  [0x50, 0x4B, 0x03, 0x04], // ZIP archive (could contain executable)
  [0x52, 0x61, 0x72, 0x21], // RAR archive
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
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
 * Check file signature (magic bytes) against expected types
 */
const validateFileSignature = async (file: File, expectedType: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        resolve(false);
        return;
      }

      const bytes = new Uint8Array(buffer);
      const signatures = FILE_SIGNATURES[expectedType as keyof typeof FILE_SIGNATURES];
      
      if (!signatures) {
        resolve(true); // No signature defined, allow
        return;
      }

      // Check if any signature matches
      const matches = signatures.some(signature => {
        return signature.every((byte, index) => bytes[index] === byte);
      });

      resolve(matches);
    };
    reader.onerror = () => resolve(false);
    
    // Read first 32 bytes to check signature
    const blob = file.slice(0, 32);
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Check for dangerous file signatures
 */
const checkForDangerousSignature = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        resolve(false);
        return;
      }

      const bytes = new Uint8Array(buffer);
      
      // Check against dangerous signatures
      const isDangerous = DANGEROUS_SIGNATURES.some(signature => {
        return signature.every((byte, index) => bytes[index] === byte);
      });

      resolve(isDangerous);
    };
    reader.onerror = () => resolve(false);
    
    // Read first 32 bytes to check signature
    const blob = file.slice(0, 32);
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Enhanced file validation with magic byte checking
 */
export const validateFile = async (
  file: File, 
  type: 'video' | 'image'
): Promise<FileValidationResult> => {
  const allowedTypes = type === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const warnings: string[] = [];

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
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.js', '.vbs', '.php', '.asp', '.jsp'];
  const lowerFileName = file.name.toLowerCase();
  if (suspiciousExtensions.some(ext => lowerFileName.includes(ext))) {
    return {
      isValid: false,
      error: 'File name contains suspicious extensions.'
    };
  }

  // Check for dangerous file signatures
  try {
    const isDangerous = await checkForDangerousSignature(file);
    if (isDangerous) {
      return {
        isValid: false,
        error: 'File contains dangerous executable signature.'
      };
    }
  } catch (error) {
    warnings.push('Could not verify file signature');
  }

  // Validate file signature matches MIME type
  try {
    const signatureValid = await validateFileSignature(file, file.type);
    if (!signatureValid) {
      warnings.push('File signature does not match MIME type - possible file type spoofing');
      // Still allow but warn
    }
  } catch (error) {
    warnings.push('Could not validate file signature');
  }

  // Additional checks for very small files (possible malformed)
  if (file.size < 100) {
    warnings.push('File is very small and may be malformed');
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /^\./, // Hidden files
    /script/i, // Contains 'script'
    /\.(php|asp|jsp|exe|bat)$/i, // Server-side or executable extensions
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    warnings.push('File name contains suspicious patterns');
  }

  return { 
    isValid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  };
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
 * Enhanced file name sanitization
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    // Remove or replace dangerous characters
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    // Remove Unicode control characters
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '_')
    // Replace multiple spaces/underscores with single underscore
    .replace(/[\s_]{2,}/g, '_')
    // Remove leading/trailing dots, spaces, underscores
    .replace(/^[.\s_]+|[.\s_]+$/g, '')
    // Limit length
    .substring(0, 255)
    // Ensure not empty
    || 'unnamed_file';
};

/**
 * Content sanitization for user input (XSS prevention)
 */
export const sanitizeContent = (content: string): string => {
  return content
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove JavaScript protocols
    .replace(/javascript:/gi, '')
    // Remove data: URLs
    .replace(/data:/gi, '')
    // Remove other dangerous protocols
    .replace(/(vbscript|mocha|livescript):/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
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
 * Gets user agent string (sanitized)
 */
export const getUserAgent = (): string => {
  return navigator.userAgent.substring(0, 500); // Limit length
};