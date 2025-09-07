import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  enabled?: boolean;
}

export const useSessionTimeout = ({
  timeoutMinutes = 30,
  warningMinutes = 5,
  enabled = true
}: UseSessionTimeoutOptions = {}) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const showWarning = useCallback(() => {
    toast({
      title: "Session bientôt expirée",
      description: `Votre session expirera dans ${warningMinutes} minutes d'inactivité. Bougez la souris ou appuyez sur une touche pour rester connecté.`,
      duration: warningMinutes * 60 * 1000, // Show warning for the remaining time
    });
  }, [toast, warningMinutes]);

  const handleTimeout = useCallback(() => {
    toast({
      title: "Session expirée",
      description: "Vous avez été déconnecté pour des raisons de sécurité.",
      variant: "destructive",
    });
    signOut();
  }, [toast, signOut]);

  const resetTimer = useCallback(() => {
    if (!enabled || !user) return;

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    lastActivityRef.current = Date.now();

    // Set warning timer
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;
    if (warningMs > 0) {
      warningRef.current = setTimeout(showWarning, warningMs);
    }

    // Set timeout timer
    const timeoutMs = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [enabled, user, timeoutMinutes, warningMinutes, showWarning, handleTimeout]);

  const handleActivity = useCallback(() => {
    // Throttle activity detection to avoid excessive timer resets
    const now = Date.now();
    if (now - lastActivityRef.current > 10000) { // Only reset every 10 seconds
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled || !user) {
      // Clear timers if not enabled or user not logged in
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      return;
    }

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [enabled, user, handleActivity, resetTimer]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current
  };
};