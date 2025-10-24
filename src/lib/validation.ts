export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Password validation with strength requirements
export const validatePassword = (password: string): ValidationResult => {
  if (password.length < 8) {
    return { isValid: false, message: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: "Le mot de passe doit contenir au moins une minuscule" };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: "Le mot de passe doit contenir au moins une majuscule" };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: "Le mot de passe doit contenir au moins un chiffre" };
  }
  
  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    return { isValid: false, message: "Le mot de passe doit contenir au moins un caractère spécial" };
  }
  
  return { isValid: true };
};

// Email validation (more strict than HTML5)
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const maxLength = 254; // RFC compliant max length
  
  if (email.length > maxLength) {
    return { isValid: false, message: "L'adresse email est trop longue" };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Format d'email invalide" };
  }
  
  return { isValid: true };
};

// Swiss IBAN validation
export const validateSwissIBAN = (iban: string): ValidationResult => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (!cleaned.startsWith('CH')) {
    return { isValid: false, message: "L'IBAN doit être suisse (commencer par CH)" };
  }
  
  if (cleaned.length !== 21) {
    return { isValid: false, message: `L'IBAN suisse doit contenir exactement 21 caractères (actuellement: ${cleaned.length})` };
  }
  
  if (!/^CH\d{19}$/.test(cleaned)) {
    // Trouver les caractères non numériques après CH
    const afterCH = cleaned.substring(2);
    const invalidChars = afterCH.match(/[^\d]/g);
    if (invalidChars) {
      return { 
        isValid: false, 
        message: `L'IBAN suisse doit contenir uniquement des chiffres après "CH". Caractères invalides trouvés: ${invalidChars.join(', ')}` 
      };
    }
    return { isValid: false, message: "Format IBAN invalide" };
  }
  
  return { isValid: true };
};

// Swiss VAT number validation
export const validateSwissVAT = (vat: string): ValidationResult => {
  const cleaned = vat.replace(/[\s.-]/g, '').toUpperCase();
  
  if (!cleaned.startsWith('CHE')) {
    return { isValid: false, message: "Le numéro TVA doit commencer par CHE" };
  }
  
  if (!/^CHE\d{9}(MWST|TVA|IVA)?$/.test(cleaned)) {
    return { isValid: false, message: "Format de numéro TVA invalide" };
  }
  
  return { isValid: true };
};

// Swiss phone number validation
export const validateSwissPhone = (phone: string): ValidationResult => {
  const cleaned = phone.replace(/[\s()-]/g, '');
  
  // Swiss phone patterns: +41... or 0...
  if (!/^(\+41|0)[0-9]{9}$/.test(cleaned)) {
    return { isValid: false, message: "Format de numéro suisse invalide" };
  }
  
  return { isValid: true };
};

// Swiss postal code validation
export const validateSwissPostalCode = (npa: string): ValidationResult => {
  if (!/^\d{4}$/.test(npa)) {
    return { isValid: false, message: "Le NPA doit contenir exactement 4 chiffres" };
  }
  
  const code = parseInt(npa);
  if (code < 1000 || code > 9999) {
    return { isValid: false, message: "NPA invalide" };
  }
  
  return { isValid: true };
};

// URL validation for webhooks
export const validateWebhookURL = (url: string): ValidationResult => {
  try {
    const parsed = new URL(url);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, message: "L'URL doit utiliser HTTP ou HTTPS" };
    }
    
    if (parsed.protocol === 'http:' && !parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
      return { isValid: false, message: "Utilisez HTTPS pour les URLs publiques" };
    }
    
    // Allowlist common webhook domains
    const allowedDomains = [
      'hooks.zapier.com',
      'hook.eu1.make.com',
      'n8n.io',
      'localhost',
      '127.0.0.1'
    ];
    
    const isAllowed = allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      return { isValid: false, message: "Domaine webhook non autorisé" };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: "URL invalide" };
  }
};

// Text input sanitization and length validation
export const validateTextInput = (text: string, maxLength: number = 1000, fieldName: string = "champ"): ValidationResult => {
  if (text.length > maxLength) {
    return { isValid: false, message: `${fieldName} ne peut dépasser ${maxLength} caractères` };
  }
  
  // Check for potentially dangerous patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i
  ];
  
  const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(text));
  if (hasSuspiciousContent) {
    return { isValid: false, message: "Contenu non autorisé détecté" };
  }
  
  return { isValid: true };
};

// Numeric validation
export const validateNumeric = (value: string | number, min?: number, max?: number): ValidationResult => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, message: "Valeur numérique requise" };
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, message: `La valeur doit être supérieure ou égale à ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, message: `La valeur doit être inférieure ou égale à ${max}` };
  }
  
  return { isValid: true };
};

// Sanitize HTML content
export const sanitizeHTML = (html: string): string => {
  // Basic HTML sanitization - remove script tags and event handlers
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};